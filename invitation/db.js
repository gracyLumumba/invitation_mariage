// database/db.js — Module central d'accès à la base de données

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'mariage.db');

let _db;
function getDb() {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
  }
  return _db;
}

// ---- INVITÉS ----

function findInvite(code_secret) {
  return getDb().prepare('SELECT * FROM invites WHERE code_secret = ?').get(code_secret.toUpperCase());
}

function findInviteById(id) {
  return getDb().prepare('SELECT * FROM invites WHERE id = ?').get(id);
}

function codeExists(code_secret) {
  return !!findInvite(code_secret);
}

function marquerCodeUtilise(code_secret, ip) {
  return getDb().prepare(`
    UPDATE invites SET code_utilise = 1, ip_connexion = ? WHERE code_secret = ?
  `).run(ip, code_secret.toUpperCase());
}

function enregistrerReponse(code_secret, statut) {
  const now = new Date().toLocaleString('fr-FR');
  return getDb().prepare(`
    UPDATE invites SET statut = ?, date_reponse = ? WHERE code_secret = ?
  `).run(statut, now, code_secret.toUpperCase());
}

function validerPresence(code_secret) {
  const now = new Date().toLocaleString('fr-FR');
  return getDb().prepare(`
    UPDATE invites SET presente = 1, date_presence = ? WHERE code_secret = ?
  `).run(now, code_secret.toUpperCase());
}

function getAllInvites() {
  return getDb().prepare('SELECT * FROM invites ORDER BY table_num, nom').all();
}

function updateInvite(id, data) {
  const { nom, table_num, nb_couverts, menu, statut } = data;
  return getDb().prepare(`
    UPDATE invites SET nom = ?, table_num = ?, nb_couverts = ?, menu = ?, statut = ? WHERE id = ?
  `).run(nom, table_num, nb_couverts, menu, statut, id);
}

function createInvite(data) {
  const { nom, code_secret, table_num, nb_couverts, menu } = data;
  return getDb().prepare(`
    INSERT INTO invites (nom, code_secret, table_num, nb_couverts, menu)
    VALUES (?, ?, ?, ?, ?)
  `).run(nom, code_secret.toUpperCase(), table_num, nb_couverts, menu);
}

function deleteInvite(id) {
  return getDb().prepare('DELETE FROM invites WHERE id = ?').run(id);
}

function resetInviteCode(id, newCode) {
  return getDb().prepare(`
    UPDATE invites
    SET code_secret = ?, code_utilise = 0, ip_connexion = NULL, presente = 0, date_presence = NULL
    WHERE id = ?
  `).run(newCode.toUpperCase(), id);
}

// ---- LOGS SÉCURITÉ ----

function logSecurite(type, code_tente, nom_tente, ip, message) {
  return getDb().prepare(`
    INSERT INTO logs_securite (type, code_tente, nom_tente, ip, message)
    VALUES (?, ?, ?, ?, ?)
  `).run(type, code_tente, nom_tente, ip, message);
}

function getLogsSecurite() {
  return getDb().prepare('SELECT * FROM logs_securite ORDER BY created_at DESC LIMIT 100').all();
}

// ---- STATISTIQUES ----

function getStats() {
  const db = getDb();
  return {
    total:      db.prepare("SELECT COUNT(*) as n FROM invites").get().n,
    acceptes:   db.prepare("SELECT COUNT(*) as n FROM invites WHERE statut = 'accepte'").get().n,
    refuses:    db.prepare("SELECT COUNT(*) as n FROM invites WHERE statut = 'refuse'").get().n,
    en_attente: db.prepare("SELECT COUNT(*) as n FROM invites WHERE statut = 'en_attente'").get().n,
    presents:   db.prepare("SELECT COUNT(*) as n FROM invites WHERE presente = 1").get().n,
    couverts:   db.prepare("SELECT SUM(nb_couverts) as n FROM invites WHERE statut = 'accepte'").get().n || 0,
    fraudes:    db.prepare("SELECT COUNT(*) as n FROM logs_securite WHERE type = 'fraude'").get().n,
    taux_reponse: db.prepare("SELECT ROUND(100.0 * COUNT(*) / NULLIF((SELECT COUNT(*) FROM invites), 0), 0) as n FROM invites WHERE statut != 'en_attente'").get().n || 0,
  };
}

module.exports = {
  findInvite, findInviteById, codeExists, marquerCodeUtilise, enregistrerReponse, validerPresence,
  getAllInvites, updateInvite, createInvite, deleteInvite, resetInviteCode,
  logSecurite, getLogsSecurite, getStats
};
