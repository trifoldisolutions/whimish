const ROLE_LABELS = {
  founder: 'Founder',
  superadmin: 'Superadmin',
  content_moderator: 'Content moderator',
  support_admin: 'Support admin',
};

function formatRole(role) {
  return ROLE_LABELS[role] || role;
}

module.exports = formatRole;
