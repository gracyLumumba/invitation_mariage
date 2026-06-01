// seed-demo.js
// Remet la base PostgreSQL/Supabase dans un etat de demonstration propre.

require('dotenv').config();

const db = require('./db');

const invitesDemoData = [
  { nom: 'Jeanne & Paul Martin',   code_secret: 'YC01', table_num: 3, nb_couverts: 2, menu: 'standard' },
  { nom: 'Robert Dupont',          code_secret: 'YC02', table_num: 5, nb_couverts: 1, menu: 'standard' },
  { nom: 'Sophie Lambert',         code_secret: 'YC03', table_num: 7, nb_couverts: 1, menu: 'vegetarien' },
  { nom: 'Thomas & Laura Petit',   code_secret: 'YC04', table_num: 3, nb_couverts: 2, menu: 'standard' },
  { nom: 'Martine Chantia Sr.',    code_secret: 'YC05', table_num: 1, nb_couverts: 1, menu: 'standard' },
  { nom: 'Eric Yannick Sr.',       code_secret: 'YC06', table_num: 1, nb_couverts: 1, menu: 'standard' },
  { nom: 'Cedric Mbaye',           code_secret: 'YC07', table_num: 4, nb_couverts: 1, menu: 'standard' },
  { nom: 'Aline & Jacques Renaud', code_secret: 'YC08', table_num: 6, nb_couverts: 2, menu: 'standard' },
  { nom: 'Fatou Diallo',           code_secret: 'YC09', table_num: 8, nb_couverts: 1, menu: 'vegetarien' },
  { nom: 'Pierre & Claire Moreau', code_secret: 'YC10', table_num: 2, nb_couverts: 2, menu: 'standard' },
];

async function main() {
  await db.initDb();

  await db.query('TRUNCATE logs_securite, sessions_admin, invites RESTART IDENTITY');

  for (const invite of invitesDemoData) {
    await db.query(
      `INSERT INTO invites (nom, code_secret, table_num, nb_couverts, menu)
       VALUES ($1, $2, $3, $4, $5)`,
      [invite.nom, invite.code_secret, invite.table_num, invite.nb_couverts, invite.menu]
    );
  }

  console.log('[OK] Base demo PostgreSQL remise a zero.');
  console.log('\nComptes demo :');
  for (const invite of invitesDemoData) {
    console.log(`  ${invite.code_secret} | ${invite.nom} | table ${invite.table_num} | ${invite.nb_couverts} couvert(s)`);
  }
}

main()
  .catch((err) => {
    console.error('[ERREUR] Seed impossible:', err.message);
    process.exitCode = 1;
  })
  .finally(() => db.close());
