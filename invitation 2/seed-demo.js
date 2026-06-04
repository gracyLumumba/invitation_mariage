// seed-demo.js
// Remet la base PostgreSQL/Supabase dans un etat de demonstration propre.

require('dotenv').config();

const db = require('./db');

const invitesDemoData = [
  { nom: 'Jean & Marie Dupont',   code_secret: 'TL01', pays: 'France', grace_table_france: 'Oui', nb_couverts: 2, menu: 'standard', acces_max: 3 },
  { nom: 'Luc Bernard',          code_secret: 'TL02', pays: 'France', grace_table_france: 'Oui', nb_couverts: 1, menu: 'standard', acces_max: 3 },
  { nom: 'Anne Rousseau',         code_secret: 'TL03', pays: 'France', grace_table_france: 'Oui', nb_couverts: 1, menu: 'vegetarien', acces_max: 3 },
  { nom: 'Michel & Nicole Leclerc',   code_secret: 'TL04', pays: 'France', grace_table_france: 'Oui', nb_couverts: 2, menu: 'standard', acces_max: 3 },
  { nom: 'Francoise Gérard',    code_secret: 'TL05', pays: 'France', grace_table_france: 'Oui', nb_couverts: 1, menu: 'standard', acces_max: 3 },
  { nom: 'Claude Laurent', code_secret: 'TL06', pays: 'France', grace_table_france: 'Oui', nb_couverts: 1, menu: 'standard', acces_max: 3 },
  { nom: 'Sylvain Gautier',           code_secret: 'TL07', pays: 'France', grace_table_france: 'Oui', nb_couverts: 1, menu: 'standard', acces_max: 3 },
  { nom: 'Brigitte & Pierre Moreau', code_secret: 'TL08', pays: 'France', grace_table_france: 'Oui', nb_couverts: 2, menu: 'standard', acces_max: 3 },
  { nom: 'Evelyne Robert',           code_secret: 'TL09', pays: 'France', grace_table_france: 'Oui', nb_couverts: 1, menu: 'vegetarien', acces_max: 3 },
  { nom: 'Olivier & Christine Durand', code_secret: 'TL10', pays: 'France', grace_table_france: 'Oui', nb_couverts: 2, menu: 'standard', acces_max: 3 },
  { nom: 'Gracy', code_secret: 'TL11', pays: 'France', grace_table_france: 'Oui', nb_couverts: 1, menu: 'standard', acces_max: null },
];

async function main() {
  await db.initDb();

  await db.query('TRUNCATE logs_securite, sessions_admin, invites RESTART IDENTITY');

  for (const invite of invitesDemoData) {
    await db.query(
      `INSERT INTO invites (nom, code_secret, pays, grace_table_france, nb_couverts, menu, acces_max)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [invite.nom, invite.code_secret, invite.pays, invite.grace_table_france, invite.nb_couverts, invite.menu, invite.acces_max]
    );
  }

  console.log('[OK] Base demo PostgreSQL remise a zero.');
  console.log('\nComptes demo :');
  for (const invite of invitesDemoData) {
    console.log(`  ${invite.code_secret} | ${invite.nom} | pays: ${invite.pays} | grace_table_france: ${invite.grace_table_france} | ${invite.nb_couverts} couvert(s)`);
  }
}

main()
  .catch((err) => {
    console.error('[ERREUR] Seed impossible:', err.message);
    process.exitCode = 1;
  })
  .finally(() => db.close());
