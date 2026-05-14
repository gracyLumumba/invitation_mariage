// db.js - Acces central a PostgreSQL/Supabase

const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL manquant. Cree la base Supabase puis ajoute DATABASE_URL dans .env et Render.');
}

const useSsl = process.env.DB_SSL !== 'false';

const pool = new Pool({
  connectionString,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});

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
  const result = await pool.query(sql, params);
  return result;
}

function normalizeInvite(row) {
  if (!row) return row;
  return {
    ...row,
    code_utilise: row.code_utilise ? 1 : 0,
    presente: row.presente ? 1 : 0,
  };
}

async function initDb() {
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
      ip_connexion  TEXT DEFAULT NULL,
      presente      BOOLEAN DEFAULT false,
      date_presence TEXT DEFAULT NULL,
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

    CREATE TABLE IF NOT EXISTS sessions_admin (
      id         BIGSERIAL PRIMARY KEY,
      token      TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);
}

// ---- INVITES ----

async function findInvite(code_secret) {
  const result = await query(
    'SELECT * FROM invites WHERE UPPER(code_secret) = UPPER($1)',
    [code_secret]
  );
  return normalizeInvite(result.rows[0]);
}

async function findInviteById(id) {
  const result = await query('SELECT * FROM invites WHERE id = $1', [id]);
  return normalizeInvite(result.rows[0]);
}

async function codeExists(code_secret) {
  return !!(await findInvite(code_secret));
}

async function marquerCodeUtilise(code_secret, ip) {
  return query(
    'UPDATE invites SET code_utilise = true, ip_connexion = $1 WHERE UPPER(code_secret) = UPPER($2)',
    [ip, code_secret]
  );
}

async function enregistrerReponse(code_secret, statut) {
  const now = new Date().toLocaleString('fr-FR');
  return query(
    'UPDATE invites SET statut = $1, date_reponse = $2 WHERE UPPER(code_secret) = UPPER($3)',
    [statut, now, code_secret]
  );
}

async function validerPresence(code_secret) {
  const now = new Date().toLocaleString('fr-FR');
  return query(
    'UPDATE invites SET presente = true, date_presence = $1 WHERE UPPER(code_secret) = UPPER($2)',
    [now, code_secret]
  );
}

async function getAllInvites() {
  const result = await query('SELECT * FROM invites ORDER BY table_num, nom');
  return result.rows.map(normalizeInvite);
}

async function updateInvite(id, data) {
  const { nom, table_num, nb_couverts, menu, statut } = data;
  return query(
    'UPDATE invites SET nom = $1, table_num = $2, nb_couverts = $3, menu = $4, statut = $5 WHERE id = $6',
    [nom, table_num, nb_couverts, menu, statut, id]
  );
}

async function createInvite(data) {
  const { nom, code_secret, table_num, nb_couverts, menu } = data;
  const result = await query(
    `INSERT INTO invites (nom, code_secret, table_num, nb_couverts, menu)
     VALUES ($1, UPPER($2), $3, $4, $5)
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
      )::int AS taux_reponse
    FROM invites
  `);
  return result.rows[0];
}

async function close() {
  await pool.end();
}

module.exports = {
  initDb,
  query,
  findInvite,
  findInviteById,
  codeExists,
  marquerCodeUtilise,
  enregistrerReponse,
  validerPresence,
  getAllInvites,
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
