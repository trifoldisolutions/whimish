// Deliberately unguessable mount points — see dev_resources/journal.md for why. These aren't a
// substitute for real auth (the Admin facade is still gated by requireAdmin(); Dev Resources
// currently isn't gated by anything), just a way to keep casual visitors from stumbling in.
module.exports = {
  ADMIN_BASE: '/2qm7hgsu',
  DEV_TASKS_BASE: '/mq6piwsn',
};
