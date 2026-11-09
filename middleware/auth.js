function requireUser(req, res, next) {
  if (!req.session.userId) return res.redirect('/app/login');
  next();
}

// Redirects to `<mount>/login` rather than a hardcoded path so this works for any router that
// applies it — each facade defines its own /login under its own mount.
function requireAdmin(...allowedRoles) {
  return (req, res, next) => {
    if (!req.session.adminId) return res.redirect(`${req.baseUrl}/login`);
    if (allowedRoles.length && !allowedRoles.includes(req.session.adminRole)) {
      return res.status(403).send('Forbidden');
    }
    next();
  };
}

module.exports = { requireUser, requireAdmin };
