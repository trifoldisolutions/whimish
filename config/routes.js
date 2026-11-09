// Deliberately unguessable mount point — see dev_resources/journal.md for why. It isn't a
// substitute for real auth (the Admin facade is still gated by requireAdmin()), just a way to
// keep casual visitors from stumbling in.
module.exports = {
  ADMIN_BASE: '/2qm7hgsu',
};
