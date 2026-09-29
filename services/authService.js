const bcrypt = require('bcryptjs');
const { getCollection } = require('../db/mongo');

async function findUserByEmail(email) {
  const users = await getCollection('user');
  return users.findOne({ email });
}

async function signup({ email, name, password }) {
  const existing = await findUserByEmail(email);
  if (existing) {
    return { ok: false, reason: 'Account already exists' };
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const users = await getCollection('user');
  await users.insertOne({ email, name, passwordHash, createdAt: new Date() });
  return { ok: true };
}

async function login({ email, password }) {
  const user = await findUserByEmail(email);
  if (!user) return { ok: false, reason: 'Invalid email or password' };

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) return { ok: false, reason: 'Invalid email or password' };

  return { ok: true, user: { email: user.email, name: user.name } };
}

module.exports = { signup, login, findUserByEmail };
