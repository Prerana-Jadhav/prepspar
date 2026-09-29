const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const env = require('./config/env');

const pagesRouter = require('./routes/pages');
const authRouter = require('./routes/auth');
const resumeRouter = require('./routes/resume');
const interviewRouter = require('./routes/interview');

const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/static', express.static(__dirname + '/public'));
app.use(
  session({
    secret: env.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 4 },
  })
);

app.use('/', pagesRouter);
app.use('/', authRouter);
app.use('/', resumeRouter);
app.use('/', interviewRouter);

app.use((req, res) => {
  res.status(404).render('error', { message: 'Page not found', code: 404 });
});

app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).render('error', {
    message: status === 500 ? 'Something went wrong. Please try again.' : err.message,
    code: status,
  });
});

app.listen(env.port, () => {
  console.log(`PrepSpar server running on http://localhost:${env.port}`);
});
