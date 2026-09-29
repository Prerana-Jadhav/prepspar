const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const asyncHandler = require('../middleware/asyncHandler');
const { getCollection } = require('../db/mongo');

router.get('/', (req, res) => res.render('home', { user: req.session.user || null }));
router.get('/about', (req, res) => res.render('about', { user: req.session.user || null }));
router.get('/tips', (req, res) => res.render('tips', { user: req.session.user || null }));
router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('login');
});

router.get('/dashboard', requireAuth, (req, res) => {
  res.render('dashboard', { profile: req.session.user.name });
});

router.get('/interview', requireAuth, (req, res) => {
  if (!req.session.interview || !req.session.interview.questions?.length) {
    return res.redirect('/dashboard');
  }
  res.render('interview', {
    candidateName: req.session.user.name,
    candidateRole: req.session.interview.resume.role,
    questionCount: req.session.interview.questions.length,
  });
});

router.get('/result', requireAuth, (req, res) => res.render('result'));

router.get('/feedback', (req, res) => res.render('feedback', { submitted: false, user: req.session.user || null }));

router.post(
  '/feedback',
  asyncHandler(async (req, res) => {
    const { name, email, message } = req.body;
    try {
      const feedback = await getCollection('feedback');
      await feedback.insertOne({ name, email, message, createdAt: new Date() });
    } catch (err) {
      console.error('[pages] failed to store feedback:', err.message);
    }
    res.render('feedback', { submitted: true, user: req.session.user || null });
  })
);

router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

module.exports = router;
