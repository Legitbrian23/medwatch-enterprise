import { MongoMemoryServer } from 'mongodb-memory-server';
import { connectDb, disconnect } from '../db/client.js';
import { createCollections } from '../db/createCollections.js';
import { createIndexes } from '../db/createIndexes.js';

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  const db = await connectDb(uri, 'medwatch_test');
  await createCollections(db);
  await createIndexes(db);
});

afterAll(async () => {
  await disconnect();
  await mongod.stop();
});
