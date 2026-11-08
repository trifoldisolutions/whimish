const ROLE_LABELS = {
  founder: 'Founder',
  superadmin: 'Superadmin',
  content_moderator: 'Content moderator',
  support_admin: 'Support admin',
  supervisor: 'Supervisor',
  leader: 'Leader',
  associate: 'Associate',
};

function formatRole(role) {
  return ROLE_LABELS[role] || role;
}

module.exports = formatRole;
