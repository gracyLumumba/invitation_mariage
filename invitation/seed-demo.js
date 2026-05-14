// seed-demo.js
// Remet la base locale dans un etat de demonstration propre.

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'mariage.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS invites (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    nom           TEXT    NOT NULL,
    code_secret   TEXT    NOT NULL UNIQUE,
    table_num     INTEGER DEFAULT 0,
    nb_couverts   INTEGER DEFAULT 1,
    menu          TEXT    DEFAULT 'standard',
    code_utilise  INTEGER DEFAULT 0,
    statut        TEXT    DEFAULT 'en_attente',
    date_reponse  TEXT    DEFAULT NULL,
    ip_connexion  TEXT    DEFAULT NULL,
    presente      INTEGER DEFAULT 0,
    date_presence TEXT    DEFAULT NULL,
    created_at    TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS logs_securite (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    type        TEXT NOT NULL,
    code_tente  TEXT,
    nom_tente   TEXT,
    ip          TEXT,
    message     TEXT,
    created_at  TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions_admin (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    token      TEXT NOT NULL UNIQUE,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

const invitesDemoData = [
  { nom: 'Robert Dupont',          code_secret: 'YC01', table_num: 5, nb_couverts: 1, menu: 'standard' },
  { nom: 'Jeanne & Paul Martin',   code_secret: 'YC02', table_num: 3, nb_couverts: 2, menu: 'standard' },
  { nom: 'Sophie Lambert',         code_secret: 'YC03', table_num: 7, nb_couverts: 1, menu: 'vegetarien' },
  { nom: 'Thomas & Laura Petit',   code_secret: 'YC04', table_num: 3, nb_couverts: 2, menu: 'standard' },
  { nom: 'Martine Chantia Sr.',    code_secret: 'YC05', table_num: 1, nb_couverts: 1, menu: 'standard' },
  { nom: 'Eric Yannick Sr.',       code_secret: 'YC06', table_num: 1, nb_couverts: 1, menu: 'standard' },
  { nom: 'Cedric Mbaye',           code_secret: 'YC07', table_num: 4, nb_couverts: 1, menu: 'standard' },
  { nom: 'Aline & Jacques Renaud', code_secret: 'YC08', table_num: 6, nb_couverts: 2, menu: 'standard' },
  { nom: 'Fatou Diallo',           code_secret: 'YC09', table_num: 8, nb_couverts: 1, menu: 'vegetarien' },
  { nom: 'Pierre & Claire Moreau', code_secret: 'YC10', table_num: 2, nb_couverts: 2, menu: 'standard' },
];

const insert = db.prepare(`
  INSERT INTO invites (nom, code_secret, table_num, nb_couverts, menu)
  VALUES (@nom, @code_secret, @table_num, @nb_couverts, @menu)
`);

const resetDemo = db.transaction((invites) => {
  db.prepare('DELETE FROM logs_securite').run();
  db.prepare('DELETE FROM sessions_admin').run();
  db.prepare('DELETE FROM invites').run();
  db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('invites', 'logs_securite', 'sessions_admin')").run();

  for (const invite of invites) insert.run(invite);
});

resetDemo(invitesDemoData);

console.log('[OK] Base demo remise a zero.');
console.log(`[FICHIER] ${DB_PATH}`);
console.log('\nComptes demo :');
for (const invite of invitesDemoData) {
  console.log(`  ${invite.code_secret} | ${invite.nom} | table ${invite.table_num} | ${invite.nb_couverts} couvert(s)`);
}

db.close();
