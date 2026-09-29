const { MongoClient } = require('mongodb');
const env = require('../config/env');

let client;
let dbPromise;

function getDb() {
  if (!dbPromise) {
    client = new MongoClient(env.mongodbUri, { serverSelectionTimeoutMS: 8000 });
    dbPromise = client.connect().then(
      () => client.db(env.mongodbDb),
      (err) => {
        dbPromise = null; // allow retry on the next request instead of caching the failure forever
        throw err;
      }
    );
  }
  return dbPromise;
}

async function getCollection(name) {
  const db = await getDb();
  return db.collection(name);
}

module.exports = { getDb, getCollection };
