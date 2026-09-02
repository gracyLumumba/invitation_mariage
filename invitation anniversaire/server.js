require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.BIND_HOST || '0.0.0.0';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ADMIN1234';
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:'],
      mediaSrc: ["'self'"],
      connectSrc: ["'self'"],
    },
  },
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

function nowIso() {
  return new Date().toISOString();
}

function ensureDataFile() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({
      visitors: [],
      events: []
    }, null, 2));
  }
}

function readData() {
  ensureDataFile();
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return { visitors: [], events: [] };
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  return header.split(';').reduce((acc, part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return acc;
    const key = part.slice(0, idx).trim();
    const value = decodeURIComponent(part.slice(idx + 1).trim());
    acc[key] = value;
    return acc;
  }, {});
}

function setCookie(res, name, value, days = 30) {
  const maxAge = days * 24 * 60 * 60;
  const cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax`;
  res.setHeader('Set-Cookie', cookie);
}

function clearCookie(res, name) {
  res.setHeader('Set-Cookie', `${name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`);
}

function getIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';
}

function normalizeName(name) {
  return String(name || '').trim().replace(/\s+/g, ' ');
}

function normalizeNameKey(name) {
  return normalizeName(name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function findVisitorById(data, id) {
  return data.visitors.find(v => v.id === id);
}

function getCurrentVisitor(req) {
  const cookies = parseCookies(req);
  if (!cookies.visitor_id) return null;
  const data = readData();
  return findVisitorById(data, cookies.visitor_id);
}

function isAdmin(req) {
  const cookies = parseCookies(req);
  const expected = crypto.createHash('sha256').update(String(ADMIN_PASSWORD)).digest('hex');
  return cookies.admin_auth === expected;
}

function adminCookieValue() {
  return crypto.createHash('sha256').update(String(ADMIN_PASSWORD)).digest('hex');
}

function requireAdmin(req, res, next) {
  if (!isAdmin(req)) {
    return res.status(401).json({ ok: false, erreur: 'Non autorisé' });
  }
  next();
}

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/invitation', (req, res) => res.sendFile(path.join(__dirname, 'invitation.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

app.post('/api/login', (req, res) => {
  const name = normalizeName(req.body.name);
  if (!name) {
    return res.status(400).json({ ok: false, erreur: 'Le nom est obligatoire.' });
  }

  const data = readData();
  let visitor = getCurrentVisitor(req);
  const visitorId = visitor?.id || crypto.randomUUID();
  const nameKey = normalizeNameKey(name);
  const duplicate = data.visitors.find(v => normalizeNameKey(v.name) === nameKey && v.id !== visitorId);

  if (duplicate) {
    return res.status(409).json({
      ok: false,
      erreur: 'Ce nom est déjà enregistré. Chaque invité peut se connecter une seule fois.'
    });
  }

  visitor = findVisitorById(data, visitorId) || {
    id: visitorId,
    name,
    nameKey,
    loginCount: 0,
    status: 'pending',
    loginAt: null,
    rsvpAt: null,
    createdAt: nowIso(),
  };

  visitor.name = name;
  visitor.nameKey = nameKey;
  visitor.loginCount = Number(visitor.loginCount || 0) + 1;
  visitor.loginAt = nowIso();
  visitor.lastIp = getIp(req);
  visitor.updatedAt = nowIso();

  const index = data.visitors.findIndex(v => v.id === visitorId);
  if (index >= 0) {
    data.visitors[index] = visitor;
  } else {
    data.visitors.unshift(visitor);
  }

  data.events.unshift({
    id: crypto.randomUUID(),
    type: 'login',
    visitorId,
    name,
    at: nowIso(),
    ip: getIp(req),
  });

  writeData(data);
  setCookie(res, 'visitor_id', visitorId, 30);
  res.json({ ok: true, redirect: '/invitation' });
});

app.get('/api/me', (req, res) => {
  const visitor = getCurrentVisitor(req);
  if (!visitor) {
    return res.status(401).json({ ok: false, erreur: 'Non connecté' });
  }
  res.json({ ok: true, visitor });
});

app.post('/api/rsvp', (req, res) => {
  const visitor = getCurrentVisitor(req);
  if (!visitor) {
    return res.status(401).json({ ok: false, erreur: 'Non connecté' });
  }

  const status = String(req.body.status || '').toLowerCase();
  if (!['present', 'absent'].includes(status)) {
    return res.status(400).json({ ok: false, erreur: 'Statut invalide.' });
  }

  const data = readData();
  const current = findVisitorById(data, visitor.id);
  if (!current) {
    return res.status(404).json({ ok: false, erreur: 'Invité introuvable.' });
  }
  if (current.status && current.status !== 'pending') {
    return res.status(409).json({ ok: false, erreur: 'Vous avez déjà répondu.' });
  }

  current.status = status;
  current.rsvpAt = nowIso();
  current.updatedAt = nowIso();
  current.lastIp = getIp(req);

  data.events.unshift({
    id: crypto.randomUUID(),
    type: 'rsvp',
    visitorId: current.id,
    name: current.name,
    status,
    at: nowIso(),
    ip: getIp(req),
  });

  writeData(data);
  res.json({ ok: true, visitor: current });
});

app.post('/api/logout', (req, res) => {
  clearCookie(res, 'visitor_id');
  res.json({ ok: true });
});

app.post('/api/admin/login', (req, res) => {
  const password = String(req.body.password || '');
  if (password !== String(ADMIN_PASSWORD)) {
    return res.status(401).json({ ok: false, erreur: 'Mot de passe invalide.' });
  }
  setCookie(res, 'admin_auth', adminCookieValue(), 7);
  res.json({ ok: true });
});

app.post('/api/admin/logout', (req, res) => {
  clearCookie(res, 'admin_auth');
  res.json({ ok: true });
});

app.get('/api/admin/data', requireAdmin, (req, res) => {
  const data = readData();
  const visitors = [...data.visitors].sort((a, b) => String(b.updatedAt || b.loginAt || '').localeCompare(String(a.updatedAt || a.loginAt || '')));
  const present = visitors.filter(v => v.status === 'present').length;
  const absent = visitors.filter(v => v.status === 'absent').length;
  const pending = visitors.filter(v => v.status === 'pending').length;
  res.json({
    ok: true,
    stats: {
      total: visitors.length,
      present,
      absent,
      pending,
      logins: data.events.filter(e => e.type === 'login').length,
    },
    visitors,
    events: data.events.slice(0, 20),
  });
});

app.patch('/api/admin/visitors/:id', requireAdmin, (req, res) => {
  const name = normalizeName(req.body.name);
  if (!name) {
    return res.status(400).json({ ok: false, erreur: 'Le nom est obligatoire.' });
  }

  const data = readData();
  const visitor = findVisitorById(data, req.params.id);
  if (!visitor) {
    return res.status(404).json({ ok: false, erreur: 'Invité introuvable.' });
  }

  const nameKey = normalizeNameKey(name);
  const duplicate = data.visitors.find(v => v.id !== visitor.id && normalizeNameKey(v.name) === nameKey);
  if (duplicate) {
    return res.status(409).json({ ok: false, erreur: 'Ce nom est déjà utilisé par un autre invité.' });
  }

  const previousName = visitor.name;
  visitor.name = name;
  visitor.nameKey = nameKey;
  visitor.updatedAt = nowIso();
  data.events.unshift({
    id: crypto.randomUUID(),
    type: 'admin_edit',
    visitorId: visitor.id,
    name,
    previousName,
    at: nowIso(),
  });
  writeData(data);
  res.json({ ok: true, visitor });
});

app.delete('/api/admin/visitors/:id', requireAdmin, (req, res) => {
  const data = readData();
  const index = data.visitors.findIndex(v => v.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ ok: false, erreur: 'Invité introuvable.' });
  }

  data.visitors.splice(index, 1);
  data.events = data.events.filter(event => event.visitorId !== req.params.id);
  writeData(data);
  res.json({ ok: true });
});

app.get('/api/admin/export', requireAdmin, (req, res) => {
  const data = readData();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="invitation-anniversaire-data.json"');
  res.send(JSON.stringify(data, null, 2));
});

app.listen(PORT, HOST, () => {
  console.log(`[SERVER] Invitation anniversaire listening on ${HOST}:${PORT}`);
});
