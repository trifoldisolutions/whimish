const express = require('express');
const pageTitle = require('../services/pageTitle');

const router = express.Router();

router.get('/', (req, res) => {
  res.render('public/index', { title: pageTitle('Home') });
});

router.routes = [{ method: 'GET', path: '/', label: 'Landing page' }];

module.exports = router;
