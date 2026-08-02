require('dotenv').config({ quiet: true });

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3008;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.render('index', { title: 'Whimish' });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
