// Dev Resources hierarchy, highest to lowest. Separate from the founder/superadmin/
// content_moderator/support_admin admin-panel hierarchy in models/Admin.js.
const DEV_ROLES = ['supervisor', 'leader', 'associate'];

// Roles `creatorRole` is allowed to create: founder can create any dev role (entry point into
// the hierarchy, including supervisor — see routes/admin.js); each dev role can create any dev
// role strictly below it.
function allowedDevRolesToCreate(creatorRole) {
  if (creatorRole === 'founder') return DEV_ROLES;
  const idx = DEV_ROLES.indexOf(creatorRole);
  if (idx === -1) return [];
  return DEV_ROLES.slice(idx + 1);
}

// Team composition caps (see models/Team.js): a team is one leader plus up to
// MAX_ASSOCIATES_PER_TEAM associates; a leader can lead up to MAX_TEAMS_PER_LEADER teams; an
// associate can belong to up to MAX_TEAMS_PER_ASSOCIATE teams.
const MAX_ASSOCIATES_PER_TEAM = 8;
const MAX_TEAMS_PER_LEADER = 2;
const MAX_TEAMS_PER_ASSOCIATE = 3;

module.exports = {
  DEV_ROLES,
  allowedDevRolesToCreate,
  MAX_ASSOCIATES_PER_TEAM,
  MAX_TEAMS_PER_LEADER,
  MAX_TEAMS_PER_ASSOCIATE,
};
