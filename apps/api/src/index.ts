import 'dotenv/config';
import { buildServer } from './server.js';
import { connectDb } from './db/client.js';
import { createCollections } from './db/createCollections.js';
import { createIndexes } from './db/createIndexes.js';

const PORT = parseInt(process.env.PORT ?? process.env.API_PORT ?? '3001', 10);
const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017';
const MONGODB_DB = process.env.MONGODB_DB ?? 'medwatch';

async function main() {
  const db = await connectDb(MONGODB_URI, MONGODB_DB);
  await createCollections(db);
  await createIndexes(db);

  const app = await buildServer();
  await app.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`MedWatch API listening on port ${PORT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
