const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const asyncHandler = require('../middleware/asyncHandler');

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, pass } = req.body;
    if (!email || !pass) {
      return res.status(400).send({ result: false, message: 'Email and password are required' });
    }
    const result = await authService.login({ email, password: pass });
    if (!result.ok) {
      return res.send({ result: false, message: result.reason });
    }
    req.session.user = result.user;
    res.send({ result: true });
  })
);

router.post(
  '/sign-up',
  asyncHandler(async (req, res) => {
    const { email, name, pass } = req.body;
    if (!email || !name || !pass) {
      return res.status(400).send({ result: false, message: 'All fields are required' });
    }
    if (pass.length < 6) {
      return res.status(400).send({ result: false, message: 'Password must be at least 6 characters' });
    }
    const result = await authService.signup({ email, name, password: pass });
    res.send({ result: result.ok, message: result.ok ? undefined : result.reason });
  })
);

module.exports = router;
