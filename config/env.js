require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  sessionSecret: process.env.SESSION_SECRET || 'insecure_dev_secret',
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017',
  mongodbDb: process.env.MONGODB_DB || 'prepspar',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-flash-lite-latest',
};
