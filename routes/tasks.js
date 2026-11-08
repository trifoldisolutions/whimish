const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Task = require('../models/Task');
const Team = require('../models/Team');
const JournalEntry = require('../models/JournalEntry');
const Admin = require('../models/Admin');
const Dev = require('../models/Dev');
const pageTitle = require('../utils/pageTitle');
const { DEV_TASKS_BASE } = require('../config/routes');
const { requireAdmin } = require('../middleware/auth');
const { DEV_ROLES, MAX_ASSOCIATES_PER_TEAM, MAX_TEAMS_PER_LEADER, MAX_TEAMS_PER_ASSOCIATE } = require('../utils/devRoles');
const { isOverseer, canManageTeam, canViewTeam, canPostJournal } = require('../utils/teamAccess');

const router = express.Router();

// Dev Resources has its own login, separate from the Admin one. Dev-hierarchy roles
// (supervisor/leader/associate) live in their own collection (models/Dev.js); 'founder' logs in
// with their existing Admin account and is granted access on top of it.
router.get('/login', (req, res) => {
  res.render('tasks-login', { title: pageTitle('Login', 'Dev'), error: null, basePath: DEV_TASKS_BASE });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = (email || '').trim().toLowerCase();
  const dev = await Dev.findOne({ email: normalizedEmail });
  const admin = dev ? null : await Admin.findOne({ email: normalizedEmail });
  const account = dev || admin;
  const valid = account && (await bcrypt.compare(password || '', account.passwordHash));
  const authorized = valid && [...DEV_ROLES, 'founder'].includes(account.role);

  if (!authorized) {
    return res.render('tasks-login', {
      title: pageTitle('Login', 'Dev'),
      error: valid ? 'This account does not have Dev Resources access.' : 'Invalid email or password.',
      basePath: DEV_TASKS_BASE,
    });
  }

  req.session.adminId = account._id.toString();
  req.session.adminRole = account.role;
  req.session.adminDisplayName = account.displayName;
  req.session.adminEmail = account.email;
  res.redirect(DEV_TASKS_BASE);
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect(`${DEV_TASKS_BASE}/login`));
});

router.use(requireAdmin(...DEV_ROLES, 'founder'));

// --- Dashboard: your teams, plus a create-team form for founder/supervisor/leader --------------

async function loadDashboardLocals(req) {
  const { adminRole, adminId } = req.session;
  let teams;
  if (isOverseer(adminRole)) {
    teams = await Team.find().populate('leaderId', 'displayName email').sort({ createdAt: -1 });
  } else if (adminRole === 'leader') {
    teams = await Team.find({ leaderId: adminId }).populate('leaderId', 'displayName email').sort({ createdAt: -1 });
  } else {
    teams = await Team.find({ associateIds: adminId }).populate('leaderId', 'displayName email').sort({ createdAt: -1 });
  }

  let leaders = [];
  const leaderTeamCounts = {};
  if (isOverseer(adminRole)) {
    leaders = await Dev.find({ role: 'leader' }).sort({ displayName: 1, email: 1 });
    const counts = await Team.aggregate([{ $group: { _id: '$leaderId', count: { $sum: 1 } } }]);
    counts.forEach((c) => {
      leaderTeamCounts[c._id.toString()] = c.count;
    });
  }

  const ownTeamCount = adminRole === 'leader' ? await Team.countDocuments({ leaderId: adminId }) : 0;
  const canCreateTeam =
    (isOverseer(adminRole) && leaders.length > 0) || (adminRole === 'leader' && ownTeamCount < MAX_TEAMS_PER_LEADER);

  return {
    title: pageTitle('Dashboard', 'Dev'),
    basePath: DEV_TASKS_BASE,
    displayName: req.session.adminDisplayName,
    email: req.session.adminEmail,
    role: adminRole,
    teams,
    leaders,
    leaderTeamCounts,
    canCreateTeam,
    maxTeamsPerLeader: MAX_TEAMS_PER_LEADER,
  };
}

router.get('/', async (req, res) => {
  res.render('dashboard', { ...(await loadDashboardLocals(req)), createTeamError: null });
});

router.post('/teams', async (req, res) => {
  const { adminRole, adminId } = req.session;
  if (!isOverseer(adminRole) && adminRole !== 'leader') return res.status(403).send('Forbidden');

  const renderError = async (createTeamError) =>
    res.render('dashboard', { ...(await loadDashboardLocals(req)), createTeamError });

  const { name } = req.body;
  const targetLeaderId = adminRole === 'leader' ? adminId : req.body.leaderId;

  if (!name || !name.trim()) return renderError('Team name is required.');
  if (!targetLeaderId || !mongoose.Types.ObjectId.isValid(targetLeaderId)) {
    return renderError('Choose a leader for this team.');
  }

  const leader = await Dev.findOne({ _id: targetLeaderId, role: 'leader' });
  if (!leader) return renderError('Leader not found.');

  const existingCount = await Team.countDocuments({ leaderId: targetLeaderId });
  if (existingCount >= MAX_TEAMS_PER_LEADER) {
    return renderError(
      `${leader.displayName || leader.email} already leads the maximum of ${MAX_TEAMS_PER_LEADER} teams.`
    );
  }

  await Team.create({ name: name.trim(), leaderId: targetLeaderId, associateIds: [] });
  res.redirect(DEV_TASKS_BASE);
});

// --- Team detail: roster + tasks + journal -------------------------------------------------

async function getTeam(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return Team.findById(id);
}

async function loadTeamLocals(team, req) {
  const populatedTeam = await Team.findById(team._id)
    .populate('leaderId', 'displayName email')
    .populate('associateIds', 'displayName email');

  const [tasks, journalEntries] = await Promise.all([
    Task.find({ teamId: team._id }).sort({ createdAt: -1 }),
    JournalEntry.find({ teamId: team._id }).populate('authorId', 'displayName email').sort({ createdAt: -1 }),
  ]);

  const manage = canManageTeam(team, req.session);
  const canPostJournalEntry = canPostJournal(team, req.session);

  let availableAssociates = [];
  if (manage) {
    const currentIds = new Set(team.associateIds.map((id) => id.toString()));
    const candidates = await Dev.find({ role: 'associate' }).sort({ displayName: 1, email: 1 });
    const teamCounts = await Team.aggregate([
      { $unwind: '$associateIds' },
      { $group: { _id: '$associateIds', count: { $sum: 1 } } },
    ]);
    const countMap = {};
    teamCounts.forEach((c) => {
      countMap[c._id.toString()] = c.count;
    });
    availableAssociates = candidates.filter((c) => {
      const idStr = c._id.toString();
      if (currentIds.has(idStr)) return false;
      return (countMap[idStr] || 0) < MAX_TEAMS_PER_ASSOCIATE;
    });
  }

  return {
    title: pageTitle(team.name, 'Dev'),
    basePath: DEV_TASKS_BASE,
    displayName: req.session.adminDisplayName,
    email: req.session.adminEmail,
    role: req.session.adminRole,
    team: populatedTeam,
    tasks,
    journalEntries,
    manage,
    canPostJournalEntry,
    availableAssociates,
    maxAssociatesPerTeam: MAX_ASSOCIATES_PER_TEAM,
  };
}

router.get('/teams/:id', async (req, res) => {
  const team = await getTeam(req.params.id);
  if (!team) return res.status(404).send('Not found');
  if (!canViewTeam(team, req.session)) return res.status(403).send('Forbidden');

  const locals = await loadTeamLocals(team, req);
  res.render('team', { ...locals, taskError: null, journalError: null, rosterError: null });
});

router.post('/teams/:id/associates', async (req, res) => {
  const team = await getTeam(req.params.id);
  if (!team) return res.status(404).send('Not found');
  if (!canManageTeam(team, req.session)) return res.status(403).send('Forbidden');

  const renderError = async (rosterError) =>
    res.render('team', { ...(await loadTeamLocals(team, req)), taskError: null, journalError: null, rosterError });

  const { associateId } = req.body;
  if (!associateId || !mongoose.Types.ObjectId.isValid(associateId)) {
    return renderError('Choose an associate to add.');
  }

  const associate = await Dev.findOne({ _id: associateId, role: 'associate' });
  if (!associate) return renderError('Associate not found.');
  if (team.associateIds.some((id) => id.equals(associateId))) return renderError('Already on this team.');
  if (team.associateIds.length >= MAX_ASSOCIATES_PER_TEAM) {
    return renderError(`Teams can have at most ${MAX_ASSOCIATES_PER_TEAM} associates.`);
  }

  const associateTeamCount = await Team.countDocuments({ associateIds: associateId });
  if (associateTeamCount >= MAX_TEAMS_PER_ASSOCIATE) {
    return renderError(
      `${associate.displayName || associate.email} is already on the maximum of ${MAX_TEAMS_PER_ASSOCIATE} teams.`
    );
  }

  await Team.findByIdAndUpdate(team._id, { $push: { associateIds: associateId } });
  res.redirect(`${DEV_TASKS_BASE}/teams/${team._id}`);
});

router.post('/teams/:id/associates/:associateId/remove', async (req, res) => {
  const team = await getTeam(req.params.id);
  if (!team) return res.status(404).send('Not found');
  if (!canManageTeam(team, req.session)) return res.status(403).send('Forbidden');

  await Team.findByIdAndUpdate(team._id, { $pull: { associateIds: req.params.associateId } });
  res.redirect(`${DEV_TASKS_BASE}/teams/${team._id}`);
});

// --- Tasks (team-scoped) ---------------------------------------------------------------------

router.post('/teams/:id/tasks', async (req, res) => {
  const team = await getTeam(req.params.id);
  if (!team) return res.status(404).send('Not found');
  if (!canManageTeam(team, req.session)) return res.status(403).send('Forbidden');

  const { title, description, status } = req.body;
  if (!title || !title.trim()) {
    return res.render('team', {
      ...(await loadTeamLocals(team, req)),
      taskError: 'Title is required.',
      journalError: null,
      rosterError: null,
    });
  }

  await Task.create({
    teamId: team._id,
    title: title.trim(),
    description: (description || '').trim(),
    status: status || 'todo',
  });
  res.redirect(`${DEV_TASKS_BASE}/teams/${team._id}`);
});

router.post('/teams/:id/tasks/:taskId', async (req, res) => {
  const team = await getTeam(req.params.id);
  if (!team) return res.status(404).send('Not found');
  if (!canManageTeam(team, req.session)) return res.status(403).send('Forbidden');

  const { title, description, status } = req.body;
  await Task.findOneAndUpdate(
    { _id: req.params.taskId, teamId: team._id },
    { title: (title || '').trim(), description: (description || '').trim(), status }
  );
  res.redirect(`${DEV_TASKS_BASE}/teams/${team._id}`);
});

router.post('/teams/:id/tasks/:taskId/delete', async (req, res) => {
  const team = await getTeam(req.params.id);
  if (!team) return res.status(404).send('Not found');
  if (!canManageTeam(team, req.session)) return res.status(403).send('Forbidden');

  await Task.findOneAndDelete({ _id: req.params.taskId, teamId: team._id });
  res.redirect(`${DEV_TASKS_BASE}/teams/${team._id}`);
});

// --- Journal (associate daily reports, team-scoped) -------------------------------------------

router.post('/teams/:id/journal', async (req, res) => {
  const team = await getTeam(req.params.id);
  if (!team) return res.status(404).send('Not found');
  if (!canPostJournal(team, req.session)) return res.status(403).send('Forbidden');

  const { content } = req.body;
  if (!content || !content.trim()) {
    return res.render('team', {
      ...(await loadTeamLocals(team, req)),
      taskError: null,
      rosterError: null,
      journalError: 'Write something before posting.',
    });
  }

  await JournalEntry.create({ teamId: team._id, authorId: req.session.adminId, content: content.trim() });
  res.redirect(`${DEV_TASKS_BASE}/teams/${team._id}`);
});

router.routes = [
  { method: 'GET', path: '/login', label: 'Log in (supervisor/leader/associate/founder only)' },
  { method: 'POST', path: '/login', label: 'Log in' },
  { method: 'POST', path: '/logout', label: 'Log out' },
  { method: 'GET', path: '/', label: 'Dashboard: your teams (requires dev session)' },
  { method: 'POST', path: '/teams', label: 'Create a team (founder/supervisor/leader)' },
  { method: 'GET', path: '/teams/:id', label: 'Team detail: roster + tasks + journal' },
  { method: 'POST', path: '/teams/:id/associates', label: 'Add an associate to a team (team leader/supervisor/founder)' },
  {
    method: 'POST',
    path: '/teams/:id/associates/:associateId/remove',
    label: 'Remove an associate from a team (team leader/supervisor/founder)',
  },
  { method: 'POST', path: '/teams/:id/tasks', label: 'Create a task (team leader/supervisor/founder)' },
  { method: 'POST', path: '/teams/:id/tasks/:taskId', label: 'Update a task (team leader/supervisor/founder)' },
  { method: 'POST', path: '/teams/:id/tasks/:taskId/delete', label: 'Delete a task (team leader/supervisor/founder)' },
  { method: 'POST', path: '/teams/:id/journal', label: 'Post a journal entry (associate, team member only)' },
];

module.exports = router;
