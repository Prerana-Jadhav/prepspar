const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const router = express.Router();
const requireAuth = require('../middleware/requireAuth');
const asyncHandler = require('../middleware/asyncHandler');
const resumeService = require('../services/resumeService');
const aiService = require('../services/aiService');

const UPLOAD_ROOT = path.join(__dirname, '..', 'upload');

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    const dir = path.join(UPLOAD_ROOT, req.sessionID);
    fs.mkdirSync(dir, { recursive: true });
    callback(null, dir);
  },
  filename: (req, file, callback) => {
    callback(null, `resume${path.extname(file.originalname)}`);
  },
});

const ALLOWED_EXT = ['.pdf', '.doc', '.docx'];

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXT.includes(ext)) {
      return callback(new Error('Only PDF, DOC, and DOCX resumes are supported'));
    }
    callback(null, true);
  },
});

router.post(
  '/resume-recognize',
  requireAuth,
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).send({ error: 'Oops... Something went wrong!!\nPlease try again.' });
    }

    try {
      const parsed = await resumeService.parseResume(req.file.path, req.file.originalname);
      const questions = await aiService.generateQuestions({
        skills: parsed.skills,
        role: parsed.role,
        experienceSummary: parsed.experienceSummary,
        count: 5,
      });

      req.session.interview = {
        questions,
        answers: [],
        resume: { skills: parsed.skills, role: parsed.role },
      };

      res.send({ data: parsed.skills, role: parsed.role, questionCount: questions.length });
    } catch (err) {
      console.error('[resume] failed to process resume:', err.message);
      res.status(500).send({ error: 'Could not process the uploaded resume. Please try again.' });
    } finally {
      fs.rm(path.join(UPLOAD_ROOT, req.sessionID), { recursive: true, force: true }, () => {});
    }
  })
);

// Multer errors (bad file type, too large) land here instead of the generic error page.
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message?.includes('resume')) {
    return res.status(400).send({ error: err.message });
  }
  next(err);
});

module.exports = router;
