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
  { id: 1, nom: 'Jean & Marie Dupont', code_secret: 'TL01', pays: 'France', grace_table_france: 'Oui', nb_couverts: 2, menu: 'standard', statut: 'en_attente', boisson: null, acces_count: 0, acces_max: 3, code_utilise: false, presente: false },
  { id: 2, nom: 'Luc Bernard', code_secret: 'TL02', pays: 'France', grace_table_france: 'Oui', nb_couverts: 1, menu: 'standard', statut: 'en_attente', boisson: null, acces_count: 0, acces_max: 3, code_utilise: false, presente: false },
  { id: 3, nom: 'Anne Rousseau', code_secret: 'TL03', pays: 'France', grace_table_france: 'Oui', nb_couverts: 1, menu: 'vegetarien', statut: 'en_attente', boisson: null, acces_count: 0, acces_max: 3, code_utilise: false, presente: false },
  { id: 4, nom: 'Michel & Nicole Leclerc', code_secret: 'TL04', pays: 'France', grace_table_france: 'Oui', nb_couverts: 2, menu: 'standard', statut: 'en_attente', boisson: null, acces_count: 0, acces_max: 3, code_utilise: false, presente: false },
  { id: 5, nom: 'Francoise Gérard', code_secret: 'TL05', pays: 'France', grace_table_france: 'Oui', nb_couverts: 1, menu: 'standard', statut: 'en_attente', boisson: null, acces_count: 0, acces_max: 3, code_utilise: false, presente: false },
  { id: 6, nom: 'Claude Laurent', code_secret: 'TL06', pays: 'France', grace_table_france: 'Oui', nb_couverts: 1, menu: 'standard', statut: 'en_attente', boisson: null, acces_count: 0, acces_max: 3, code_utilise: false, presente: false },
  { id: 7, nom: 'Sylvain Gautier', code_secret: 'TL07', pays: 'France', grace_table_france: 'Oui', nb_couverts: 1, menu: 'standard', statut: 'en_attente', boisson: null, acces_count: 0, acces_max: 3, code_utilise: false, presente: false },
  { id: 8, nom: 'Brigitte & Pierre Moreau', code_secret: 'TL08', pays: 'France', grace_table_france: 'Oui', nb_couverts: 2, menu: 'standard', statut: 'en_attente', boisson: null, acces_count: 0, acces_max: 3, code_utilise: false, presente: false },
  { id: 9, nom: 'Evelyne Robert', code_secret: 'TL09', pays: 'France', grace_table_france: 'Oui', nb_couverts: 1, menu: 'vegetarien', statut: 'en_attente', boisson: null, acces_count: 0, acces_max: 3, code_utilise: false, presente: false },
  { id: 10, nom: 'Olivier & Christine Durand', code_secret: 'TL10', pays: 'France', grace_table_france: 'Oui', nb_couverts: 2, menu: 'standard', statut: 'en_attente', boisson: null, acces_count: 0, acces_max: 3, code_utilise: false, presente: false },
  { id: 11, nom: 'Gracy', code_secret: 'TL11', pays: 'France', grace_table_france: 'Oui', nb_couverts: 1, menu: 'standard', statut: 'en_attente', boisson: null, acces_count: 0, acces_max: null, code_utilise: false, presente: false },
];

const demoLogs = [];

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
    acces_max: row.acces_max == null ? null : Number(row.acces_max),
    presente: row.presente ? 1 : 0,
  };
}

async function initDb() {
  if (useDemoDb) {
    console.warn('[DB] DATABASE_URL manquant : mode demo local active (sans PostgreSQL).');
    return;
  }

  await query(`
    CREATE TABLE IF NOT EXISTS invites (
      id            BIGSERIAL PRIMARY KEY,
      nom           TEXT NOT NULL,
      code_secret   TEXT NOT NULL UNIQUE,
      pays          TEXT DEFAULT 'France',
      grace_table_france TEXT DEFAULT 'Oui',
      nb_couverts   INTEGER DEFAULT 1,
      menu          TEXT DEFAULT 'standard',
      code_utilise  BOOLEAN DEFAULT false,
      statut        TEXT DEFAULT 'en_attente',
      date_reponse  TEXT DEFAULT NULL,
      boisson       TEXT DEFAULT NULL,
      ip_connexion  TEXT DEFAULT NULL,
      acces_count   INTEGER DEFAULT 0,
      acces_max     INTEGER DEFAULT 3,
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

  await query(`
    ALTER TABLE invites ADD COLUMN IF NOT EXISTS boisson TEXT DEFAULT NULL;
    ALTER TABLE invites ADD COLUMN IF NOT EXISTS acces_count INTEGER DEFAULT 0;
    ALTER TABLE invites ADD COLUMN IF NOT EXISTS acces_max INTEGER DEFAULT 3;
    UPDATE invites
    SET acces_count = 1
    WHERE code_utilise = true AND COALESCE(acces_count, 0) = 0;
    UPDATE invites
    SET acces_max = NULL
    WHERE UPPER(code_secret) = 'TL11' OR LOWER(nom) = 'gracy';
  `);
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

async function findInviteByNameTable(nom, pays) {
  if (useDemoDb) {
    const normalizedName = String(nom || '').trim().toLowerCase();
    const invite = demoInvites.find(row =>
      row.nom.trim().toLowerCase() === normalizedName &&
      String(row.pays || '').toLowerCase() === String(pays || '').toLowerCase()
    );
    return normalizeInvite(invite);
  }

  const result = await query(
    `SELECT *
     FROM invites
     WHERE LOWER(TRIM(nom)) = LOWER(TRIM($1))
       AND LOWER(TRIM(pays)) = LOWER(TRIM($2))
     LIMIT 1`,
    [nom, pays]
  );
  return normalizeInvite(result.rows[0]);
}

async function codeExists(code_secret) {
  return !!(await findInvite(code_secret));
}

async function marquerCodeUtilise(code_secret, ip) {
  if (useDemoDb) {
    const invite = demoInvites.find(i => i.code_secret.toUpperCase() === code_secret.toUpperCase());
    if (invite) { invite.acces_count++; invite.ip_connexion = ip; }
    return { rowCount: 1 };
  }
  return query(
     `UPDATE invites
      SET acces_count = COALESCE(acces_count, 0) + 1,
          code_utilise = CASE
            WHEN acces_max IS NULL THEN false
            ELSE (COALESCE(acces_count, 0) + 1) >= COALESCE(acces_max, 3)
          END,
          ip_connexion = $1
      WHERE UPPER(code_secret) = UPPER($2)`,
    [ip, code_secret]
  );
}

async function enregistrerReponse(code_secret, statut, boisson = null) {
  if (useDemoDb) {
    const invite = demoInvites.find(i => i.code_secret.toUpperCase() === code_secret.toUpperCase());
    if (invite) { invite.statut = statut; invite.boisson = boisson; invite.date_reponse = new Date().toLocaleString(); }
    return { rowCount: 1, rows: [invite] };
  }
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
  if (useDemoDb) {
    const invite = demoInvites.find(i => i.code_secret.toUpperCase() === code_secret.toUpperCase());
    if (invite) { invite.presente = true; invite.date_presence = new Date().toLocaleString(); }
    return { rowCount: 1, rows: [invite] };
  }
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
  if (useDemoDb) return demoInvites.map(normalizeInvite);
  const result = await query('SELECT * FROM invites ORDER BY pays, nom');
  return result.rows.map(normalizeInvite);
}

async function getServeurDashboard() {
  if (useDemoDb) return demoInvites.filter(i => i.presente).map(normalizeInvite);
  const result = await query(`
    SELECT
      id,
      nom,
      code_secret,
      pays,
      grace_table_france,
      nb_couverts,
      menu,
      boisson,
      statut,
      presente,
      date_presence
    FROM invites
    WHERE presente = true
      AND statut != 'refuse'
    ORDER BY pays NULLS LAST, date_presence DESC, nom
  `);
  return result.rows.map(normalizeInvite);
}

async function updateInvite(id, data) {
  const { nom, pays, grace_table_france, nb_couverts, menu, statut, boisson } = data;
  return query(
    'UPDATE invites SET nom = $1, pays = $2, grace_table_france = $3, nb_couverts = $4, menu = $5, statut = $6, boisson = $7 WHERE id = $8',
    [nom, pays, grace_table_france, nb_couverts, menu, statut, boisson, id]
  );
}

async function createInvite(data) {
  const { nom, code_secret, pays, grace_table_france, nb_couverts, menu, acces_max = 3 } = data;
  const result = await query(
    `INSERT INTO invites (nom, code_secret, pays, grace_table_france, nb_couverts, menu, acces_max)
     VALUES ($1, UPPER($2), $3, $4, $5, $6, $7)
     RETURNING id`,
    [nom, code_secret, pays, grace_table_france, nb_couverts, menu, acces_max]
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
  if (useDemoDb) {
    demoLogs.push({ id: demoLogs.length + 1, type, code_tente, nom_tente, ip, message, created_at: new Date().toISOString() });
    return;
  }
  return query(
    `INSERT INTO logs_securite (type, code_tente, nom_tente, ip, message)
     VALUES ($1, $2, $3, $4, $5)`,
    [type, code_tente, nom_tente, ip, message]
  );
}

async function getLogsSecurite() {
  if (useDemoDb) {
    return demoLogs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 100);
  }
  const result = await query('SELECT * FROM logs_securite ORDER BY created_at DESC LIMIT 100');
  return result.rows;
}

// ---- STATISTIQUES ----

async function getStats() {
  if (useDemoDb) {
    const total = demoInvites.length;
    const acceptes = demoInvites.filter(i => i.statut === 'accepte').length;
    const refuses = demoInvites.filter(i => i.statut === 'refuse').length;
    const en_attente = demoInvites.filter(i => i.statut === 'en_attente').length;
    const presents = demoInvites.filter(i => i.presente).length;
    const couverts = demoInvites.filter(i => i.statut === 'accepte').reduce((sum, i) => sum + i.nb_couverts, 0);
    const fraudes = demoLogs.filter(l => l.type === 'fraude').length;
    const taux_reponse = total > 0 ? Math.round(100 * (acceptes + refuses) / total) : 0;
    
    return { total, acceptes, refuses, en_attente, presents, couverts, fraudes, taux_reponse };
  }
  
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
