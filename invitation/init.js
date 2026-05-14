// init.js - Cree les tables PostgreSQL/Supabase
// Lancer avec : node init.js

require('dotenv').config();

const db = require('./db');

async function main() {
  await db.initDb();
  console.log('[OK] Base PostgreSQL initialisee avec succes.');
}

main()
  .catch((err) => {
    console.error('[ERREUR] Initialisation impossible:', err.message);
    process.exitCode = 1;
  })
  .finally(() => db.close());
