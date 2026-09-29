# PrepSpar

PrepSpar is an AI-powered mock interview platform. It reads a candidate's resume, generates a fresh set of interview questions tailored to their actual skills and experience, conducts a spoken interview with a webcam-recorded session, offers real-time AI hints if the candidate goes quiet for too long, and produces a scored performance report at the end.

**Live Demo:** [https://prepspar.onrender.com/](https://prepspar.onrender.com/)

## Features

- **Resume-Aware Question Generation** — Upload a PDF or DOCX resume. The app extracts your skills and likely role, then calls an LLM to generate a unique, non-repeating set of interview questions every session (falls back to a curated static question bank if the AI call is unavailable).
- **Live AI Interviewer** — A webcam + speech-to-text interview flow with a synthesized voice reading each question aloud.
- **Real-Time Hints** — If you go quiet for too long on a question, the AI interviewer offers a short, non-spoiling nudge to help you keep going.
- **AI-Scored Feedback** — Every answer is evaluated for accuracy and completeness, with a model answer and a per-question score, plus an overall performance summary.
- **Accounts** — Email/password signup and login with hashed passwords and server-side sessions.

## Tech Stack

| Layer | Technology |
|---|---|
| Server | Node.js, Express, EJS |
| Database | MongoDB |
| Auth | express-session, bcryptjs |
| Resume Parsing | pdf-parse (PDF), mammoth (DOCX) |
| AI | Google Gemini API (free tier) |
| File Upload | Multer |

## Getting Started

### Prerequisites

- Node.js 14+ (18+ recommended)
- A MongoDB instance (local, or a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster)
- A free Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)

### Installation

```bash
git clone https://github.com/Prerana-Jadhav/PrepSpar.git
cd PrepSpar
npm install
```

### Configuration

Copy the example environment file and fill in your own values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `PORT` | Port the server listens on (default `5000`) |
| `SESSION_SECRET` | Random string used to sign session cookies |
| `MONGODB_URI` | MongoDB connection string |
| `MONGODB_DB` | Database name |
| `GEMINI_API_KEY` | Your free Gemini API key from Google AI Studio |
| `GEMINI_MODEL` | Chat model to use (default `gemini-flash-lite-latest`) |

### Running

```bash
npm start
```

The app will be available at `http://localhost:5000`.

## Project Structure

```
config/       Environment configuration
db/           MongoDB connection helper
middleware/   Auth guard and async error handling
services/     Auth, resume parsing, and AI logic
routes/       Express route handlers (pages, auth, resume, interview)
views/        EJS templates (+ shared partials)
public/       Static assets, CSS, and client-side JS
```

## Security Notes

- Passwords are hashed with bcrypt.
- Secrets (API key, session secret, DB URI) are read from environment variables only — never commit a real `.env` file.
