const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const pageTitle = require('../utils/pageTitle');

const router = express.Router();

router.get('/', (req, res) => {
  res.render('app/index', { title: pageTitle('Home', 'App'), loggedIn: Boolean(req.session.userId) });
});

router.get('/login', (req, res) => {
  res.render('app/login-signup', { title: pageTitle('Login', 'App'), error: null });
});

router.post('/signup', async (req, res) => {
  const { email, password, displayName } = req.body;
  if (!email || !password) {
    return res.render('app/login-signup', {
      title: pageTitle('Login', 'App'),
      error: 'Email and password are required.',
    });
  }

  const existing = await User.findOne({ email: email.trim().toLowerCase() });
  if (existing) {
    return res.render('app/login-signup', {
      title: pageTitle('Login', 'App'),
      error: 'An account with that email already exists.',
    });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    email: email.trim().toLowerCase(),
    passwordHash,
    displayName: (displayName || '').trim(),
  });

  req.session.userId = user._id.toString();
  res.redirect('/app');
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: (email || '').trim().toLowerCase() });
  const valid = user && (await bcrypt.compare(password || '', user.passwordHash));

  if (!valid) {
    return res.render('app/login-signup', {
      title: pageTitle('Login', 'App'),
      error: 'Invalid email or password.',
    });
  }

  req.session.userId = user._id.toString();
  res.redirect('/app');
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/app/login'));
});

router.get('/user/:id', (req, res) => {
  res.render('app/user', { title: pageTitle('User', 'App') });
});

router.get('/whim/:id', (req, res) => {
  res.render('app/whim', { title: pageTitle('Whim', 'App') });
});

router.routes = [
  { method: 'GET', path: '/', label: 'App index' },
  { method: 'GET', path: '/login', label: 'Log in / Sign up' },
  { method: 'POST', path: '/signup', label: 'Create account' },
  { method: 'POST', path: '/login', label: 'Log in' },
  { method: 'POST', path: '/logout', label: 'Log out' },
  { method: 'GET', path: '/user/:id', label: 'User template page' },
  { method: 'GET', path: '/whim/:id', label: 'Whim template page' },
];

module.exports = router;
