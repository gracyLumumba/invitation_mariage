// db.js - Acces central a PostgreSQL/Supabase

const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const useDemoDb = !connectionString;

const useSsl = process.env.DB_SSL !== 'false';

const pool = connectionString
  ? new Pool({
      connectionString,
      ssl: useSsl ? { rejectUnauthorized: false } : false,
    })
  : null;

const demoInvites = [
  { id: 1, nom: 'Jeanne & Paul Martin', code_secret: 'YC01', table_num: 3, nb_couverts: 2, menu: 'standard', statut: 'en_attente', boisson: null, acces_count: 0, code_utilise: false, presente: false },
  { id: 2, nom: 'Robert Dupont', code_secret: 'YC02', table_num: 5, nb_couverts: 1, menu: 'standard', statut: 'en_attente', boisson: null, acces_count: 0, code_utilise: false, presente: false },
  { id: 3, nom: 'Sophie Lambert', code_secret: 'YC03', table_num: 7, nb_couverts: 1, menu: 'vegetarien', statut: 'en_attente', boisson: null, acces_count: 0, code_utilise: false, presente: false },
  { id: 4, nom: 'Thomas & Laura Petit', code_secret: 'YC04', table_num: 3, nb_couverts: 2, menu: 'standard', statut: 'en_attente', boisson: null, acces_count: 0, code_utilise: false, presente: false },
  { id: 5, nom: 'Martine Chantia Sr.', code_secret: 'YC05', table_num: 1, nb_couverts: 1, menu: 'standard', statut: 'en_attente', boisson: null, acces_count: 0, code_utilise: false, presente: false },
  { id: 6, nom: 'Eric Yannick Sr.', code_secret: 'YC06', table_num: 1, nb_couverts: 1, menu: 'standard', statut: 'en_attente', boisson: null, acces_count: 0, code_utilise: false, presente: false },
  { id: 7, nom: 'Cedric Mbaye', code_secret: 'YC07', table_num: 4, nb_couverts: 1, menu: 'standard', statut: 'en_attente', boisson: null, acces_count: 0, code_utilise: false, presente: false },
  { id: 8, nom: 'Aline & Jacques Renaud', code_secret: 'YC08', table_num: 6, nb_couverts: 2, menu: 'standard', statut: 'en_attente', boisson: null, acces_count: 0, code_utilise: false, presente: false },
  { id: 9, nom: 'Fatou Diallo', code_secret: 'YC09', table_num: 8, nb_couverts: 1, menu: 'vegetarien', statut: 'en_attente', boisson: null, acces_count: 0, code_utilise: false, presente: false },
  { id: 10, nom: 'Pierre & Claire Moreau', code_secret: 'YC10', table_num: 2, nb_couverts: 2, menu: 'standard', statut: 'en_attente', boisson: null, acces_count: 0, code_utilise: false, presente: false },
];

function formatDbError(err) {
  const message = err?.message || String(err);
  const isNetworkUnreachable = err?.code === 'ENETUNREACH' || /ENETUNREACH|Network is unreachable/i.test(message);
  const mentionsIpv6 = /\b[0-9a-f]{0,4}:[0-9a-f:]+\b/i.test(message);

  if (isNetworkUnreachable && mentionsIpv6) {
    return `${message}
Astuce: cette URL Supabase semble utiliser la connexion directe IPv6. Sur Render, utilise l'URL "Session pooler" Supabase IPv4-compatible dans DATABASE_URL, par exemple:
postgresql://postgres.<project-ref>:<mot-de-passe>@aws-0-<region>.pooler.supabase.com:5432/postgres`;
  }

  return message;
}

async function query(sql, params = []) {
  if (!pool) {
    throw new Error('DATABASE_URL manquant. Serveur lance en mode demo local sans PostgreSQL.');
  }
  const result = await pool.query(sql, params);
  return result;
}

function normalizeInvite(row) {
  if (!row) return row;
  return {
    ...row,
    code_utilise: row.code_utilise ? 1 : 0,
    acces_count: Number(row.acces_count || 0),
    presente: row.presente ? 1 : 0,
  };
}

async function initDb() {
  if (useDemoDb) {
    console.warn('[DB] DATABASE_URL manquant : mode demo local active (sans PostgreSQL).');
    return;
  }

  try {
  await query(`
    CREATE TABLE IF NOT EXISTS invites (
      id            BIGSERIAL PRIMARY KEY,
      nom           TEXT NOT NULL,
      code_secret   TEXT NOT NULL UNIQUE,
      table_num     INTEGER DEFAULT 0,
      nb_couverts   INTEGER DEFAULT 1,
      menu          TEXT DEFAULT 'standard',
      code_utilise  BOOLEAN DEFAULT false,
      statut        TEXT DEFAULT 'en_attente',
      date_reponse  TEXT DEFAULT NULL,
      boisson       TEXT DEFAULT NULL,
      ip_connexion  TEXT DEFAULT NULL,
      acces_count   INTEGER DEFAULT 0,
      presente      BOOLEAN DEFAULT false,
      date_presence TEXT DEFAULT NULL,
      acces_max     INTEGER DEFAULT ${_maxInviteAcces},
      created_at    TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS logs_securite (
      id          BIGSERIAL PRIMARY KEY,
      type        TEXT NOT NULL,
      code_tente  TEXT,
      nom_tente   TEXT,
      ip          TEXT,
      message     TEXT,
      created_at  TIMESTAMPTZ DEFAULT now()
    );
    `);
    console.log('[DB] Table "logs_securite" vérifiée/créée.');

    await query(`
      CREATE TABLE IF NOT EXISTS sessions_admin (
      id         BIGSERIAL PRIMARY KEY,
      token      TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ DEFAULT now()
    );
    `);
    console.log('[DB] Table "sessions_admin" vérifiée/créée.');
  await query(`
    ALTER TABLE invites ADD COLUMN IF NOT EXISTS boisson TEXT DEFAULT NULL;
    ALTER TABLE invites ADD COLUMN IF NOT EXISTS acces_count INTEGER DEFAULT 0;
    ALTER TABLE invites ADD COLUMN IF NOT EXISTS acces_max INTEGER DEFAULT ${_maxInviteAcces};
    UPDATE invites
    SET acces_count = 1
    WHERE code_utilise = true AND COALESCE(acces_count, 0) = 0;
  `);
  } catch (err) {
    console.error('[DB] Erreur lors de la création des tables :', formatDbError(err));
    throw err; // Re-throw to be caught by startServer().catch()
  }
}

// ---- INVITES ----

async function findInvite(code_secret) {
  if (useDemoDb) {
    const invite = demoInvites.find(row => row.code_secret.toUpperCase() === String(code_secret || '').toUpperCase());
    return normalizeInvite(invite);
  }

  const result = await query(
    'SELECT * FROM invites WHERE UPPER(code_secret) = UPPER($1)',
    [code_secret]
  );
  return normalizeInvite(result.rows[0]);
}

async function findInviteById(id) {
  if (useDemoDb) {
    const invite = demoInvites.find(row => Number(row.id) === Number(id));
    return normalizeInvite(invite);
  }

  const result = await query('SELECT * FROM invites WHERE id = $1', [id]);
  return normalizeInvite(result.rows[0]);
}

async function findInviteByNameTable(nom, tableNum) {
  if (useDemoDb) {
    const normalizedName = String(nom || '').trim().toLowerCase();
    const invite = demoInvites.find(row =>
      row.nom.trim().toLowerCase() === normalizedName &&
      Number(row.table_num) === Number(tableNum)
    );
    return normalizeInvite(invite);
  }

  const result = await query(
    `SELECT *
     FROM invites
     WHERE LOWER(TRIM(nom)) = LOWER(TRIM($1))
       AND table_num = $2
     LIMIT 1`,
    [nom, tableNum]
  );
  return normalizeInvite(result.rows[0]);
}

async function codeExists(code_secret) {
  return !!(await findInvite(code_secret));
}

async function marquerCodeUtilise(code_secret, ip) {
  return query(
    `UPDATE invites
     SET acces_count = COALESCE(acces_count, 0) + 1,
         code_utilise = (COALESCE(acces_count, 0) + 1) >= COALESCE(acces_max, ${_maxInviteAcces}),
         ip_connexion = $1
     WHERE UPPER(code_secret) = UPPER($2)`,
    [ip, code_secret]
  );
}

async function enregistrerReponse(code_secret, statut, boisson = null) {
  const now = new Date().toLocaleString('fr-FR');
  return query(
    `UPDATE invites
     SET statut = $1,
         date_reponse = $2,
         boisson = $3
     WHERE UPPER(code_secret) = UPPER($4)
     RETURNING *`,
    [statut, now, boisson, code_secret]
  );
}

async function validerPresence(code_secret) {
  const now = new Date().toLocaleString('fr-FR');
  return query(
    `UPDATE invites
     SET presente = true,
         date_presence = $1,
         statut = CASE WHEN statut = 'en_attente' THEN 'accepte' ELSE statut END,
         date_reponse = CASE WHEN statut = 'en_attente' THEN COALESCE(date_reponse, $1) ELSE date_reponse END
     WHERE UPPER(code_secret) = UPPER($2)
     RETURNING *`,
    [now, code_secret]
  );
}

async function getAllInvites() {
  const result = await query('SELECT * FROM invites ORDER BY id ASC');
  return result.rows.map(normalizeInvite);
}

async function getServeurDashboard() {
  const result = await query(`
    SELECT
      id,
      nom,
      code_secret,
      table_num,
      nb_couverts,
      menu,
      boisson,
      statut,
      presente,
      date_presence
    FROM invites
    WHERE presente = true
      AND statut != 'refuse'
    ORDER BY table_num NULLS LAST, date_presence DESC, nom
  `);
  return result.rows.map(normalizeInvite);
}

async function updateInvite(id, data) {
  const { nom, table_num, nb_couverts, menu, statut, boisson } = data;
  return query(
    'UPDATE invites SET nom = $1, table_num = $2, nb_couverts = $3, menu = $4, statut = $5, boisson = $6 WHERE id = $7',
    [nom, table_num, nb_couverts, menu, statut, boisson, id]
  );
}

async function createInvite(data) {
  const { nom, code_secret, table_num, nb_couverts, menu } = data;
  const result = await query(
    `INSERT INTO invites (nom, code_secret, table_num, nb_couverts, menu)
     VALUES ($1, UPPER($2), $3, $4, $5, ${_maxInviteAcces})
     RETURNING id`,
    [nom, code_secret, table_num, nb_couverts, menu]
  );
  return { lastInsertRowid: result.rows[0].id };
}

async function deleteInvite(id) {
  return query('DELETE FROM invites WHERE id = $1', [id]);
}

async function resetInviteCode(id, newCode) {
  return query(
    `UPDATE invites
     SET code_secret = UPPER($1),
         code_utilise = false,
         acces_count = 0,
         ip_connexion = NULL,
         presente = false,
         date_presence = NULL
     WHERE id = $2`,
    [newCode, id]
  );
}

// ---- LOGS SECURITE ----

async function logSecurite(type, code_tente, nom_tente, ip, message) {
  return query(
    `INSERT INTO logs_securite (type, code_tente, nom_tente, ip, message)
     VALUES ($1, $2, $3, $4, $5)`,
    [type, code_tente, nom_tente, ip, message]
  );
}

async function getLogsSecurite() {
  const result = await query('SELECT * FROM logs_securite ORDER BY created_at DESC LIMIT 100');
  return result.rows;
}

// ---- STATISTIQUES ----

async function getStats() {
  const result = await query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE statut = 'accepte')::int AS acceptes,
      COUNT(*) FILTER (WHERE statut = 'refuse')::int AS refuses,
      COUNT(*) FILTER (WHERE statut = 'en_attente')::int AS en_attente,
      COUNT(*) FILTER (WHERE presente = true)::int AS presents,
      COALESCE(SUM(nb_couverts) FILTER (WHERE statut = 'accepte'), 0)::int AS couverts,
      (SELECT COUNT(*)::int FROM logs_securite WHERE type = 'fraude') AS fraudes,
      COALESCE(
        ROUND(100.0 * COUNT(*) FILTER (WHERE statut != 'en_attente') / NULLIF(COUNT(*), 0)),
        0
      )::int AS taux_reponse,
      (SELECT COALESCE(MAX(acces_max), ${_maxInviteAcces}) FROM invites)::int AS default_acces_max
    FROM invites
  `);
  return result.rows[0];
}

async function close() {
  if (!pool) return;
  await pool.end();
}

module.exports = {
  initDb,
  query,
  findInvite,
  findInviteById,
  findInviteByNameTable,
  codeExists,
  marquerCodeUtilise,
  enregistrerReponse,
  validerPresence,
  getAllInvites,
  getServeurDashboard,
  updateInvite,
  createInvite,
  deleteInvite,
  resetInviteCode,
  logSecurite,
  getLogsSecurite,
  getStats,
  close,
  formatDbError,
};
