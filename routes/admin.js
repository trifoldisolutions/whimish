const express = require('express');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const Dev = require('../models/Dev');
const { requireAdmin } = require('../middleware/auth');
const pageTitle = require('../utils/pageTitle');
const formatRole = require('../utils/formatRole');
const { ADMIN_BASE } = require('../config/routes');
const { DEV_ROLES, allowedDevRolesToCreate } = require('../utils/devRoles');

const router = express.Router();

// Common locals every sidebar-shell page needs (see views/partials/admin-sidebar.ejs).
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

// Founder + dev hierarchy: create Dev Resources accounts. A dev role can only create roles below
// itself (see utils/devRoles.js); founder can create any dev role, including the top one,
// supervisor. Accessible to anyone with at least one role available to create.
router.get('/dev-management', requireAdmin('founder', ...DEV_ROLES), async (req, res) => {
  const creatableDevRoles = allowedDevRolesToCreate(req.session.adminRole);
  if (creatableDevRoles.length === 0) return res.status(403).send('Forbidden');
  const devs = await Dev.find().sort({ createdAt: 1 });
  res.render(
    'admin/dev-management',
    adminLocals(req, {
      title: pageTitle('Dev Management', 'Admin'),
      activeNav: 'dev-management',
      devUserError: null,
      creatableDevRoles,
      formatRole,
      devs,
    })
  );
});

// Dev Resources access is its own account collection (models/Dev.js), not an Admin row. Who can
// create which role is governed by utils/devRoles.js.
router.post('/dev-users', requireAdmin('founder', ...DEV_ROLES), async (req, res) => {
  const creatableDevRoles = allowedDevRolesToCreate(req.session.adminRole);

  const renderDevManagement = async (devUserError) =>
    res.render(
      'admin/dev-management',
      adminLocals(req, {
        title: pageTitle('Dev Management', 'Admin'),
        activeNav: 'dev-management',
        devUserError,
        creatableDevRoles,
        formatRole,
        devs: await Dev.find().sort({ createdAt: 1 }),
      })
    );

  if (creatableDevRoles.length === 0) return res.status(403).send('Forbidden');

  const { email, password, displayName, role } = req.body;
  if (!email || !password) {
    return await renderDevManagement('Email and password are required.');
  }
  if (!creatableDevRoles.includes(role)) {
    return await renderDevManagement('You are not allowed to create that role.');
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    await Dev.create({
      email: email.trim().toLowerCase(),
      passwordHash,
      displayName: (displayName || '').trim(),
      role,
      createdById: req.session.adminId,
      createdByRole: req.session.adminRole,
    });
    res.redirect(`${ADMIN_BASE}/dev-management`);
  } catch (err) {
    const devUserError =
      err.code === 11000 ? 'An account with that email already exists.' : 'Could not create dev user.';
    await renderDevManagement(devUserError);
  }
});

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
  // Admin and Dev Resources accounts live in separate collections, but either can log in from
  // this form — the session that results is shared across facades (see server.js).
  const admin = await Admin.findOne({ email: normalizedEmail });
  const dev = admin ? null : await Dev.findOne({ email: normalizedEmail });
  const account = admin || dev;
  const valid = account && (await bcrypt.compare(password || '', account.passwordHash));

  if (!valid) {
    const adminCount = await Admin.countDocuments();
    return res.render('admin/login-signup', {
      title: pageTitle('Login', 'Admin'),
      error: 'Invalid email or password.',
      bootstrapAvailable: adminCount === 0,
      basePath: ADMIN_BASE,
    });
  }

  req.session.adminId = account._id.toString();
  req.session.adminRole = account.role;
  req.session.adminDisplayName = account.displayName;
  req.session.adminEmail = account.email;
  res.redirect(ADMIN_BASE);
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect(`${ADMIN_BASE}/login`));
});

router.routes = [
  { method: 'GET', path: '/', label: 'Overview (requires admin session)' },
  { method: 'GET', path: '/admins', label: 'Admin management (founder/superadmin)' },
  { method: 'GET', path: '/users', label: 'User management (founder/superadmin/content_moderator/support_admin)' },
  { method: 'GET', path: '/dev-management', label: 'Dev Management (founder + dev hierarchy)' },
  { method: 'GET', path: '/login', label: 'Log in / Sign up' },
  { method: 'POST', path: '/signup', label: 'Create first founder (bootstrap only)' },
  { method: 'POST', path: '/login', label: 'Log in' },
  { method: 'POST', path: '/logout', label: 'Log out' },
  { method: 'POST', path: '/dev-users', label: 'Create a dev user (founder or a dev role above the target role)' },
];

module.exports = router;
