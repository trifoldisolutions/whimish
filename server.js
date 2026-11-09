require('dotenv').config({ quiet: true });

const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const path = require('path');

const publicRouter = require('./routes/public');
const appRouter = require('./routes/app');
const adminRouter = require('./routes/admin');
const { ADMIN_BASE } = require('./config/routes');

const app = express();
const PORT = process.env.PORT || 3008;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI, dbName: 'whimish' }),
    cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 24 * 7 },
  })
);

// Three public-facing facades: general public site, the app itself, and the admin panel.
// Admin is mounted at a deliberately unguessable path (config/routes.js) rather than its obvious
// name — see dev_resources/journal.md.
const facades = [
  { name: 'Public', mount: '/', router: publicRouter },
  { name: 'App', mount: '/app', router: appRouter },
  { name: 'Admin', mount: ADMIN_BASE, router: adminRouter },
];

facades.forEach(({ mount, router }) => app.use(mount, router));

function joinRoutePath(mount, subPath) {
  const base = mount === '/' ? '' : mount.replace(/\/$/, '');
  return subPath === '/' ? base || '/' : `${base}${subPath}`;
}

function printRouteMap() {
  console.log('\nRoutes:');
  facades.forEach(({ name, mount, router }) => {
    console.log(`  ${name} (${mount})`);
    (router.routes || []).forEach(({ method, path: subPath, label }) => {
      const fullPath = joinRoutePath(mount, subPath);
      const url = `http://localhost:${PORT}${fullPath}`;
      console.log(`    ${method.padEnd(4)} ${url}${label ? `  — ${label}` : ''}`);
    });
  });
  console.log('');
}

if (process.env.MONGO_URI) {
  mongoose
    .connect(process.env.MONGO_URI, { dbName: 'whimish' })
    .then(() => console.log('Connected to MongoDB (db: whimish)'))
    .catch((err) => console.error('MongoDB connection error:', err.message));
} else {
  console.warn('MONGO_URI not set — DB-backed pages will not work until it is.');
}

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  printRouteMap();
});
