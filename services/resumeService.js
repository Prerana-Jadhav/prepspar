const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

// Each canonical skill maps to every alias/abbreviation a resume might use for it.
// Aliases are matched case-insensitively; the canonical key is what gets reported.
const SKILL_ALIASES = {
  'c++': ['c++'],
  'c#': ['c#', 'csharp', 'c sharp'],
  javascript: ['javascript', 'js'],
  typescript: ['typescript', 'ts'],
  python: ['python'],
  java: ['java'],
  nodejs: ['nodejs', 'node.js', 'node js', 'node'],
  react: ['react', 'reactjs', 'react.js'],
  angular: ['angular', 'angularjs'],
  vue: ['vue', 'vuejs', 'vue.js'],
  django: ['django'],
  flask: ['flask'],
  springboot: ['springboot', 'spring boot', 'spring framework'],
  html: ['html', 'html5'],
  css: ['css', 'css3'],
  sql: ['sql'],
  mysql: ['mysql'],
  postgresql: ['postgresql', 'postgres'],
  mongodb: ['mongodb', 'mongo'],
  aws: ['aws', 'amazon web services'],
  azure: ['azure'],
  gcp: ['gcp', 'google cloud'],
  docker: ['docker'],
  kubernetes: ['kubernetes', 'k8s'],
  'cyber security': ['cyber security', 'cybersecurity'],
  'artificial intelligence': ['artificial intelligence', 'ai'],
  'machine learning': ['machine learning', 'ml'],
  'data science': ['data science'],
  dbms: ['dbms', 'database management system'],
  'data structure': ['data structure', 'data structures', 'dsa'],
  oop: ['oop', 'object oriented programming', 'object-oriented programming'],
  'computer network': ['computer network', 'computer networks', 'networking'],
  'operating system': ['operating system', 'operating systems'],
  salesforce: ['salesforce'],
  android: ['android'],
  ios: ['ios'],
  redux: ['redux'],
  graphql: ['graphql'],
  'rest api': ['rest api', 'restful api'],
  microservices: ['microservices'],
  git: ['git'],
};

const ROLE_KEYWORDS = [
  { role: 'Frontend Developer', hints: ['react', 'angular', 'vue', 'html', 'css', 'frontend'] },
  { role: 'Backend Developer', hints: ['nodejs', 'node.js', 'django', 'flask', 'springboot', 'spring boot', 'backend', 'api'] },
  { role: 'Full Stack Developer', hints: ['full stack', 'fullstack'] },
  { role: 'Data Scientist', hints: ['data science', 'machine learning', 'artificial intelligence', 'pandas', 'numpy'] },
  { role: 'DevOps Engineer', hints: ['devops', 'docker', 'kubernetes', 'ci/cd', 'aws', 'azure'] },
  { role: 'Mobile Developer', hints: ['android', 'ios', 'flutter', 'react native'] },
  { role: 'Cyber Security Analyst', hints: ['cyber security', 'penetration testing', 'network security'] },
];

async function extractText(filePath, originalName) {
  const ext = path.extname(originalName || filePath).toLowerCase();
  const buffer = fs.readFileSync(filePath);

  if (ext === '.docx') {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  // Default to PDF (also covers .pdf and unknown extensions from older clients)
  const data = await pdfParse(buffer);
  return data.text;
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function aliasMatches(alias, lower) {
  // \b doesn't work well around symbols like "c++" or "c#", so only apply
  // word boundaries when the alias is purely alphanumeric (e.g. "java" vs "javascript",
  // or "js" vs "objs"). This also stops short abbreviations like "ai" or "ml" from
  // matching inside unrelated words.
  const isWordLike = /^[a-z0-9\s.]+$/.test(alias);
  const pattern = isWordLike ? `\\b${escapeRegExp(alias)}\\b` : escapeRegExp(alias);
  return new RegExp(pattern).test(lower);
}

function extractSkills(text) {
  const lower = text.toLowerCase();
  return Object.keys(SKILL_ALIASES).filter((skill) =>
    SKILL_ALIASES[skill].some((alias) => aliasMatches(alias, lower))
  );
}

function detectRole(text, skills) {
  const lower = text.toLowerCase();
  for (const candidate of ROLE_KEYWORDS) {
    if (candidate.hints.some((hint) => lower.includes(hint) || skills.includes(hint))) {
      return candidate.role;
    }
  }
  return 'Software Engineer';
}

function summarize(text) {
  // Keep a short, model-friendly excerpt instead of dumping the whole resume.
  const cleaned = text.replace(/\s+/g, ' ').trim();
  return cleaned.slice(0, 1200);
}

async function parseResume(filePath, originalName) {
  const text = await extractText(filePath, originalName);
  const skills = extractSkills(text);
  const role = detectRole(text, skills);
  const experienceSummary = summarize(text);
  return { skills, role, experienceSummary, rawText: text };
}

module.exports = { parseResume };
