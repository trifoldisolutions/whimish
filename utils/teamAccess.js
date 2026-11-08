// Permission checks for team-scoped Dev Resources pages (routes/tasks.js). Deliberately
// role-based rather than scoped by createdBy lineage — with a single supervisor today, scoping
// further would be speculative; founder/supervisor have oversight of every team, a leader manages
// only the team(s) they lead, and an associate only participates in team(s) they belong to.
function isOverseer(role) {
  return role === 'founder' || role === 'supervisor';
}

function isTeamLeader(team, session) {
  return team.leaderId.equals(session.adminId);
}

function isTeamAssociate(team, session) {
  return team.associateIds.some((id) => id.equals(session.adminId));
}

function isTeamMember(team, session) {
  return isTeamLeader(team, session) || isTeamAssociate(team, session);
}

// Roster edits + task CRUD for a team: its own leader, or any supervisor/founder.
function canManageTeam(team, session) {
  return isOverseer(session.adminRole) || (session.adminRole === 'leader' && isTeamLeader(team, session));
}

// Viewing a team's page: anyone who manages it, plus any associate who belongs to it.
function canViewTeam(team, session) {
  return canManageTeam(team, session) || isTeamAssociate(team, session);
}

// Posting a journal entry: associate-only, and only on a team they're a member of.
function canPostJournal(team, session) {
  return session.adminRole === 'associate' && isTeamAssociate(team, session);
}

module.exports = { isOverseer, isTeamLeader, isTeamAssociate, isTeamMember, canManageTeam, canViewTeam, canPostJournal };
