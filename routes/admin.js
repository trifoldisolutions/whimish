const express = require('express');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const { requireAdmin } = require('../middleware/auth');
const pageTitle = require('../services/pageTitle');
const formatRole = require('../services/formatRole');
const { ADMIN_BASE } = require('../config/routes');

const router = express.Router();

// Common locals every sidebar-shell page needs (see views/admin/partials/sidebar.ejs).
function adminLocals(req, extra = {}) {
  return {
    role: req.session.adminRole,
    roleLabel: formatRole(req.session.adminRole),
    displayName: req.session.adminDisplayName,
    email: req.session.adminEmail,
    basePath: ADMIN_BASE,
    ...extra,
  };
}

router.get('/', requireAdmin(), (req, res) => {
  res.render('admin/index', adminLocals(req, { title: pageTitle('Home', 'Admin'), activeNav: 'overview' }));
});

// Founder + superadmin: manage content_moderator/support_admin/superadmin accounts.
router.get('/admins', requireAdmin('founder', 'superadmin'), async (req, res) => {
  const admins = await Admin.find().sort({ createdAt: 1 });
  res.render(
    'admin/admins',
    adminLocals(req, { title: pageTitle('Admins', 'Admin'), activeNav: 'admin', admins, formatRole })
  );
});

// Founder + superadmin + content_moderator + support_admin: manage app (public.users) accounts (not built yet).
router.get(
  '/users',
  requireAdmin('founder', 'superadmin', 'content_moderator', 'support_admin'),
  (req, res) => {
    res.render('admin/users', adminLocals(req, { title: pageTitle('Users', 'Admin'), activeNav: 'user' }));
  }
);

router.get('/login', async (req, res) => {
  const adminCount = await Admin.countDocuments();
  res.render('admin/login-signup', {
    title: pageTitle('Login', 'Admin'),
    error: null,
    bootstrapAvailable: adminCount === 0,
    basePath: ADMIN_BASE,
  });
});

// Self-service signup only works to create the very first admin account (always the
// founder — top of the founder > superadmin > content_moderator/support_admin hierarchy).
// Once one exists, further admins must be created by the founder or a superadmin from
// inside the admin panel — not through this public route.
router.post('/signup', async (req, res) => {
  const adminCount = await Admin.countDocuments();
  if (adminCount > 0) {
    return res.status(403).render('admin/login-signup', {
      title: pageTitle('Login', 'Admin'),
      error: 'Self-service sign-up is disabled. Ask an administrator to create your account.',
      bootstrapAvailable: false,
      basePath: ADMIN_BASE,
    });
  }

  const { email, password, displayName } = req.body;
  if (!email || !password) {
    return res.render('admin/login-signup', {
      title: pageTitle('Login', 'Admin'),
      error: 'Email and password are required.',
      bootstrapAvailable: true,
      basePath: ADMIN_BASE,
    });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await Admin.create({
    email: email.trim().toLowerCase(),
    passwordHash,
    displayName: (displayName || '').trim(),
    role: 'founder',
  });

  req.session.adminId = admin._id.toString();
  req.session.adminRole = admin.role;
  req.session.adminDisplayName = admin.displayName;
  req.session.adminEmail = admin.email;
  res.redirect(ADMIN_BASE);
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = (email || '').trim().toLowerCase();
  const admin = await Admin.findOne({ email: normalizedEmail });
  const valid = admin && (await bcrypt.compare(password || '', admin.passwordHash));

  if (!valid) {
    const adminCount = await Admin.countDocuments();
    return res.render('admin/login-signup', {
      title: pageTitle('Login', 'Admin'),
      error: 'Invalid email or password.',
      bootstrapAvailable: adminCount === 0,
      basePath: ADMIN_BASE,
    });
  }

  req.session.adminId = admin._id.toString();
  req.session.adminRole = admin.role;
  req.session.adminDisplayName = admin.displayName;
  req.session.adminEmail = admin.email;
  res.redirect(ADMIN_BASE);
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect(`${ADMIN_BASE}/login`));
});

router.routes = [
  { method: 'GET', path: '/', label: 'Overview (requires admin session)' },
  { method: 'GET', path: '/admins', label: 'Admin management (founder/superadmin)' },
  { method: 'GET', path: '/users', label: 'User management (founder/superadmin/content_moderator/support_admin)' },
  { method: 'GET', path: '/login', label: 'Log in / Sign up' },
  { method: 'POST', path: '/signup', label: 'Create first founder (bootstrap only)' },
  { method: 'POST', path: '/login', label: 'Log in' },
  { method: 'POST', path: '/logout', label: 'Log out' },
];

module.exports = router;
