const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const asyncHandler = require('../middleware/asyncHandler');
const aiService = require('../services/aiService');

function getInterview(req) {
  return req.session.interview;
}

router.get('/get-questions', requireAuth, (req, res) => {
  const interview = getInterview(req);
  if (!interview) return res.status(404).send({ data: [] });
  res.send({ data: interview.questions.map((q) => q.question) });
});

router.post(
  '/hint',
  requireAuth,
  asyncHandler(async (req, res) => {
    const interview = getInterview(req);
    const { questionIndex, partialAnswer } = req.body;
    if (!interview || !interview.questions[questionIndex]) {
      return res.status(400).send({ error: 'Invalid question index' });
    }
    const question = interview.questions[questionIndex];
    const hint = await aiService.generateHint({
      question: question.question,
      partialAnswer,
      topic: question.topic,
    });
    res.send({ hint });
  })
);

router.post('/submit-answers', requireAuth, (req, res) => {
  const interview = getInterview(req);
  if (!interview) return res.status(400).send({ error: 'No active interview session' });
  interview.answers = req.body.ans_arr || [];
  res.send({ response: 'Successful' });
});

router.get(
  '/performance-analysis',
  requireAuth,
  asyncHandler(async (req, res) => {
    const interview = getInterview(req);
    if (!interview) return res.status(400).send({ error: 'No active interview session' });

    const qaPairs = interview.questions.map((q, i) => ({
      question: q.question,
      answer: interview.answers[i] || '',
    }));

    const results = await aiService.evaluateAnswers(qaPairs);

    const data = results.map((r, i) => ({
      stext: qaPairs[i].answer,
      ftext: r.modelAnswer,
      percentage: r.score,
      feedback: r.feedback,
    }));

    res.send({ data, q_list: interview.questions.map((q) => q.question) });
  })
);

module.exports = router;
