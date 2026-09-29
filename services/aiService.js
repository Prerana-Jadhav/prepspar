const axios = require('axios');
const env = require('../config/env');
const fallbackQuestions = require('../question_bank.json');

function apiUrl(model) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function chat({ systemInstruction, prompt, temperature = 0.7, maxTokens = 800, jsonMode = false }) {
  if (!env.geminiApiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const body = {
    ...(systemInstruction ? { systemInstruction: { parts: [{ text: systemInstruction }] } } : {}),
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
      ...(jsonMode ? { responseMimeType: 'application/json' } : {}),
    },
  };

  const MAX_ATTEMPTS = 3;
  let lastErr;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await axios.post(apiUrl(env.geminiModel), body, {
        headers: {
          'x-goog-api-key': env.geminiApiKey,
          'Content-Type': 'application/json',
        },
        timeout: 20000,
      });
      const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Empty response from Gemini API');
      return text.trim();
    } catch (err) {
      lastErr = err;
      // 503 = model temporarily overloaded on the shared free tier; worth a quick retry.
      const status = err.response?.status;
      if (status === 503 && attempt < MAX_ATTEMPTS) {
        await sleep(attempt * 1000);
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

function fallbackQuestionsFor(skills, count) {
  const pool = [];
  for (const skill of skills) {
    const entry = fallbackQuestions.find(
      (q) => q.skill.trim().toLowerCase() === skill.trim().toLowerCase()
    );
    if (entry) pool.push(...entry.questions);
  }
  if (pool.length === 0) {
    for (const entry of fallbackQuestions) pool.push(...entry.questions);
  }
  const shuffled = pool.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((q) => ({ question: q, difficulty: 'medium' }));
}

/**
 * Generates a fresh, resume-tailored set of interview questions.
 * Falls back to the static question bank if the AI call fails, so the
 * interview flow never breaks even without a configured API key.
 */
async function generateQuestions({ skills, role, experienceSummary, count = 5 }) {
  try {
    const prompt = `You are a senior technical interviewer. Generate ${count} unique interview questions for a candidate.
Candidate's detected skills: ${skills.join(', ') || 'general software development'}.
Candidate's likely role: ${role || 'Software Engineer'}.
Resume highlights: ${experienceSummary || 'No further resume details available.'}

Mix conceptual, practical, and scenario-based questions relevant to the candidate's actual background instead of generic trivia. Vary the difficulty (easy, medium, hard) across the set.

Respond ONLY with a JSON object of this exact shape:
{"questions": [{"question": "string", "difficulty": "easy|medium|hard", "topic": "string"}]}`;

    const content = await chat({
      systemInstruction: 'You generate high-quality, non-generic technical interview questions and always respond with strict JSON.',
      prompt,
      temperature: 0.85,
      jsonMode: true,
    });

    const parsed = JSON.parse(content);
    if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
      return parsed.questions.slice(0, count);
    }
    throw new Error('Malformed AI response');
  } catch (err) {
    console.error('[aiService] generateQuestions falling back to static bank:', err.message);
    return fallbackQuestionsFor(skills, count);
  }
}

/**
 * Generates a short, non-spoiling nudge when the candidate has been
 * silent/stuck on a question for too long.
 */
async function generateHint({ question, partialAnswer, topic }) {
  try {
    const prompt = `The candidate is being interviewed and appears stuck on this question:
"${question}"
Topic: ${topic || 'general'}
What they've said so far (may be empty): "${partialAnswer || ''}"

Give ONE short, encouraging hint (max 2 sentences) that nudges their thinking in the right direction WITHOUT revealing the full answer. Do not just repeat the question.`;

    const content = await chat({
      systemInstruction: 'You are a supportive interview coach who gives brief, non-spoiling hints.',
      prompt,
      temperature: 0.7,
      maxTokens: 120,
    });
    return content;
  } catch (err) {
    console.error('[aiService] generateHint fallback:', err.message);
    return "Take a breath and think about the core concept the question is testing — start with a definition, then walk through a simple example.";
  }
}

/**
 * Evaluates all candidate answers in a single call, scoring accuracy and
 * completeness and providing per-question feedback plus a model answer.
 */
async function evaluateAnswers(qaPairs) {
  try {
    const prompt = `Evaluate the following interview Q&A pairs. For each, give a score (0-100) for accuracy/completeness, brief feedback (1-2 sentences), and a concise model answer.

${qaPairs
  .map((qa, i) => `${i + 1}. Question: ${qa.question}\nCandidate answer: ${qa.answer || '(no answer given)'}`)
  .join('\n\n')}

Respond ONLY with JSON of this exact shape:
{"results": [{"score": number, "feedback": "string", "modelAnswer": "string"}]}`;

    const content = await chat({
      systemInstruction: 'You are a fair, constructive technical interview evaluator. Always respond with strict JSON.',
      prompt,
      temperature: 0.4,
      maxTokens: 1500,
      jsonMode: true,
    });

    const parsed = JSON.parse(content);
    if (Array.isArray(parsed.results) && parsed.results.length === qaPairs.length) {
      return parsed.results;
    }
    throw new Error('Malformed AI response');
  } catch (err) {
    console.error('[aiService] evaluateAnswers fallback:', err.message);
    return qaPairs.map((qa) => ({
      score: qa.answer && qa.answer.length > 20 ? 60 : 20,
      feedback: qa.answer
        ? 'Automatic evaluation unavailable right now — answer recorded for manual review.'
        : 'No answer was recorded for this question.',
      modelAnswer: 'AI-generated model answer unavailable (evaluation service offline).',
    }));
  }
}

module.exports = { generateQuestions, generateHint, evaluateAnswers };
