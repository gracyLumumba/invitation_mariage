// server.js — Serveur principal Express
// Démarrer avec : node server.js  (ou  npm run dev  avec nodemon)

require('dotenv').config();

const express      = require('express');
const session      = require('express-session');
const helmet       = require('helmet');
const rateLimit    = require('express-rate-limit');
const path         = require('path');
const fs           = require('fs');
const https        = require('https');
const os           = require('os');
const crypto       = require('crypto');
const { spawnSync } = require('child_process');
const selfsigned   = require('selfsigned');
const QRCode       = require('qrcode');
const nodemailer   = require('nodemailer');
const csurf        = require('csurf');
const mongoSanitize = require('express-mongo-sanitize');
const { body, validationResult } = require('express-validator');

const db = require('./db');
const wa = require('./whatsapp');

const app  = express();
const PORT = process.env.PORT || 3000;
const BIND_HOST = process.env.BIND_HOST || '0.0.0.0'; // Écoute sur toutes les interfaces
const DISPLAY_HOST = process.env.DISPLAY_HOST || 'localhost'; // Affichage pour l'utilisateur local
const USE_HTTPS = process.env.HTTPS !== 'false';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'MARIAGE2026';
const SCANNER_TOKEN = process.env.SCANNER_TOKEN || 'SCANNER2026';
const SERVEUR_PASSWORD = process.env.SERVEUR_PASSWORD || process.env.SERVEURS_PASSWORD || 'SERVEURS2026';
const SITE_URL = process.env.SITE_URL || `${USE_HTTPS ? 'https' : 'http'}://${DISPLAY_HOST}:${PORT}`;

// Configuration Email pour les notifications
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'gragralulu31@gmail.com',
    pass: process.env.GMAIL_APP_PASSWORD || 'zosbctqewsqsylru' 
  }
});

const ADMIN_EMAIL = 'gragralulu31@gmail.com';

const MAX_INVITE_ACCES = Number(process.env.MAX_INVITE_ACCES || 3);
const BOISSON_OPTIONS = String(process.env.BOISSON_OPTIONS || 'Eau,Jus,Soda')
  .split(',')
  .map(v => v.trim())
  .filter(Boolean);
const BOISSON_CHOIX_OPTIONS = BOISSON_OPTIONS.filter(v => !/^eau$/i.test(v));
const CERT_HOST = process.env.CERT_HOST || DISPLAY_HOST;
const QR_DIR = path.join(__dirname, 'qrcodes');
const CERT_DIR = path.join(__dirname, 'certs');
const CERT_KEY = path.join(CERT_DIR, 'localhost-key.pem');
const CERT_CRT = path.join(CERT_DIR, 'localhost.pem');

app.set('trust proxy', 1);

function getLocalIp() {
  const ifaces = os.networkInterfaces();
  const candidates = [];
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        candidates.push(iface.address);
      }
    }
  }
  return candidates.find(ip => /^192\.168\./.test(ip)) ||
    candidates.find(ip => /^10\./.test(ip)) ||
    candidates.find(ip => /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) ||
    candidates[0] ||
    'localhost';
}

// ============================================
// MIDDLEWARES
// ============================================

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      scriptSrcElem: ["'self'", "'unsafe-inline'", 'https://unpkg.com', 'https://cdn.jsdelivr.net', 'https://cdnjs.cloudflare.com'],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:'],
      mediaSrc: ["'self'"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  noSniff: true,
  xssFilter: true
}));
app.use(mongoSanitize());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/css', express.static(__dirname));
app.get('/instrumentale mariage.mpeg', (req, res) => {
  res.type('audio/mpeg');
  res.sendFile(path.join(__dirname, 'instrumentale mariage.mpeg'));
});
app.use(express.static(__dirname));

// Sessions
app.use(session({
  secret: process.env.SESSION_SECRET || 'mariage2026secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: USE_HTTPS, maxAge: 6 * 60 * 60 * 1000, httpOnly: true, sameSite: 'strict' }
  cookie: { secure: USE_HTTPS, maxAge: 6 * 60 * 60 * 1000, httpOnly: true, sameSite: 'lax' }
}));

// Rate limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Réduit de 20 à 5
  message: { erreur: 'Trop de tentatives. Réessayez dans 15 minutes.' },
  standardHeaders: false,
  skip: (req) => req.session?.admin // Admin ne sont pas limités
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: false
});

// Servir les QR codes
app.use('/qrcodes', (req, res, next) => {
  next();
}, express.static(path.join(__dirname, 'qrcodes')));


// ============================================
// UTILITAIRES
// ============================================

function getIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'inconnue';
}

async function envoyerAlerteConnexion(nom, code, ip) {
  const mailOptions = {
    from: '"Système Mariage" <gragralulu31@gmail.com>',
    to: ADMIN_EMAIL,
    subject: `🔔 Connexion : ${nom}`,
    text: `L'invité ${nom} (Code: ${code}) vient de se connecter en ligne.\nIP: ${ip}\nHeure: ${new Date().toLocaleString('fr-FR')}`
  };

  try {
    console.log(`[EMAIL] Tentative d'envoi d'alerte pour ${nom} à ${ADMIN_EMAIL}`);
    const info = await transporter.sendMail(mailOptions);
    console.log('[EMAIL] Alerte envoyée:', info.messageId);
  } catch (err) {
    console.error('[EMAIL] Erreur envoi alerte:', err.message, err.response);
  }
}

function normaliserNom(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' et ')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function requireInvite(req, res, next) {
  if (!req.session.invite) {
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ erreur: 'Session expirée. Veuillez vous reconnecter.' });
    }
    return res.redirect('/');
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.admin) {
    return res.status(401).json({ erreur: 'Non autorisé' });
  }
  next();
}

function requireServeur(req, res, next) {
  if (!req.session.serveur) {
    return res.status(401).json({ erreur: 'Accès serveur non autorisé.' });
  }
  next();
}

function requireScanner(req, res, next) {
  if (!req.session.scanner) {
    return res.status(401).json({ erreur: 'Accès scanner non autorisé.' });
  }
  next();
}

function validateInput(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ erreur: 'Données invalides', details: errors.array() });
  }
  next();
}

function getRequestBaseUrl(req) {
  const configuredUrl = String(process.env.SITE_URL || '').trim().replace(/\/+$/, '');
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const proto = forwardedProto || req.protocol || (USE_HTTPS ? 'https' : 'http');
  const host = req.get('host');
  const localIp = getLocalIp();

  if (host) {
    const hostParts = host.split(':');
    const hostname = hostParts[0];
    const port = hostParts.slice(1).join(':');
    if ((hostname === 'localhost' || hostname === '127.0.0.1') && localIp !== 'localhost') {
      return `${proto}://${localIp}${port ? `:${port}` : ''}`;
    }
    return `${proto}://${host}`;
  }
  return configuredUrl || SITE_URL.replace(/\/+$/, '');
}

function inviteUrl(invite, baseUrl) {
  const params = new URLSearchParams({ code: invite.code_secret });
  return `${baseUrl}/?${params.toString()}`;
}

function isValidBoisson(boisson) {
  return BOISSON_OPTIONS.includes(String(boisson || '').trim());
}

function parseBoissons(value) {
  return String(value || '')
    .split(/\s*[\/,;]\s*/)
    .map(v => v.trim())
    .filter(Boolean);
}

function areValidBoissons(boisson, count) {
  const choices = parseBoissons(boisson);
  const expected = Math.max(1, Number(count || 1));
  return choices.length === expected && choices.every(choice => BOISSON_CHOIX_OPTIONS.includes(choice));
}

function qrUrl(invite, baseUrl = SITE_URL.replace(/\/+$/, '')) {
  const params = new URLSearchParams({
    code: invite.code_secret,
    table: String(invite.table_num || ''),
  });
  return `${baseUrl}/valider-entree?${params.toString()}`;
}

async function ensureQrCode(invite, baseUrl) {
  fs.mkdirSync(QR_DIR, { recursive: true });
  const filePath = path.join(QR_DIR, `${invite.code_secret}.png`);
  await QRCode.toFile(filePath, qrUrl(invite, baseUrl), {
    width: 300,
    margin: 2,
    color: { dark: '#2C1F1F', light: '#FAF7F2' },
    errorCorrectionLevel: 'H'
  });
  return filePath;
}

async function publicInvitationPayload(invite, baseUrl) {
  const qrFilePath = await ensureQrCode(invite, baseUrl);
  return {
    nom: invite.nom,
    code_secret: invite.code_secret,
    table_num: invite.table_num,
    nb_couverts: invite.nb_couverts,
    menu: invite.menu,
    statut: invite.statut,
    qr_url: qrUrl(invite, baseUrl),
    qr_image: `data:image/png;base64,${fs.readFileSync(qrFilePath).toString('base64')}`
  };
}

async function nextInviteCode() {
  for (let i = 1; i < 10000; i += 1) {
    const code = `YC${String(i).padStart(2, '0')}`;
    if (!(await db.codeExists(code))) return code;
  }
  throw new Error('Impossible de générer un code disponible.');
}

function getHttpsCredentials() {
  fs.mkdirSync(CERT_DIR, { recursive: true });

  if (fs.existsSync(CERT_KEY) && fs.existsSync(CERT_CRT)) {
    console.log('[HTTPS] Certificats locaux existants trouvés.');
    return {
      key: fs.readFileSync(CERT_KEY),
      cert: fs.readFileSync(CERT_CRT)
    };
  }

  const mkcertCheck = spawnSync('mkcert', ['-version'], { encoding: 'utf8' });
  if (!mkcertCheck.error && mkcertCheck.status === 0) {
    console.log('[HTTPS] mkcert trouvé, génération de certificat local approuvé…');
    const install = spawnSync('mkcert', ['-install'], { encoding: 'utf8' });
    if (install.error || install.status !== 0) {
      console.warn('[HTTPS] mkcert -install a échoué :', install.stderr || install.stdout || install.error?.message);
    }
    const mkcertCreate = spawnSync('mkcert', ['-key-file', CERT_KEY, '-cert-file', CERT_CRT, CERT_HOST, '127.0.0.1', '::1'], { encoding: 'utf8' });
    if (!mkcertCreate.error && mkcertCreate.status === 0) {
      console.log('[HTTPS] Certificat mkcert créé avec succès.');
      return {
        key: fs.readFileSync(CERT_KEY),
        cert: fs.readFileSync(CERT_CRT)
      };
    }
    console.warn('[HTTPS] Génération mkcert échouée, fallback vers certificat auto-signé.');
  } else {
    console.log('[HTTPS] mkcert non trouvé, création d’un certificat auto-signé.');
  }

  const attrs = [{ name: 'commonName', value: CERT_HOST }];
  const pems = selfsigned.generate(attrs, {
    days: 365,
    keySize: 2048,
    algorithm: 'sha256',
    extensions: [
      {
        name: 'subjectAltName',
        altNames: [
          { type: 2, value: CERT_HOST },
          { type: 7, ip: '127.0.0.1' },
          { type: 7, ip: '::1' }
        ]
      }
    ]
  });

  fs.writeFileSync(CERT_KEY, pems.private, 'utf8');
  fs.writeFileSync(CERT_CRT, pems.cert, 'utf8');

  return {
    key: fs.readFileSync(CERT_KEY),
    cert: fs.readFileSync(CERT_CRT)
  };
}

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3, // Strictement limité
  skipSuccessfulRequests: true,
  message: { erreur: 'Trop de tentatives. Réessayez dans 15 minutes.' }
});

function timingSafeCompare(a, b) {
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

// ============================================
// PAGES HTML
// ============================================

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/i/:code', (req, res) => {
  const code = String(req.params.code || '').trim().toUpperCase();
  res.redirect(`/?code=${encodeURIComponent(code)}`);
});
app.get('/invitation', requireInvite, (req, res) => res.sendFile(path.join(__dirname, 'invitation.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/scanner', (req, res) => res.sendFile(path.join(__dirname, 'scanner.html')));
app.get('/serveurs', (req, res) => res.sendFile(path.join(__dirname, 'serveurs.html')));

// ============================================
// API INVITÉS
// ============================================

// POST /api/connexion — Vérification nom + code secret
app.post('/api/connexion', loginLimiter,
  body('nom').trim().isLength({ min: 1, max: 100 }).withMessage('Nom invalide'),
  body('code_secret').trim().isLength({ min: 4, max: 10 }).toUpperCase().withMessage('Code invalide'),
  validateInput,
  async (req, res) => {
    const { nom, code_secret } = req.body;
    const ip = getIp(req);

    const invite = await db.findInvite(code_secret);

    if (!invite) {
      await db.logSecurite('tentative_invalide', code_secret, nom, ip, 'Code inconnu');
      return res.status(401).json({ erreur: 'Code secret introuvable. Vérifiez le code indiqué sur votre invitation.' });
    }

    if (normaliserNom(invite.nom) !== normaliserNom(nom)) {
      await db.logSecurite('tentative_invalide', code_secret, nom, ip, 'Nom incorrect pour ce code');
      return res.status(401).json({ erreur: 'Ce code existe, mais le nom saisi ne correspond pas à cette invitation.' });
    }

    if (Number(invite.acces_count || 0) >= MAX_INVITE_ACCES) {
      await db.logSecurite('fraude', code_secret, nom, ip, 'Limite d’accès atteinte');
      wa.envoyerNotification(wa.msgFraude(code_secret, invite.nom, ip));
      return res.status(403).json({ erreur: `Ce code a déjà été utilisé ${MAX_INVITE_ACCES} fois. Contactez Yannick ou Chantia si vous pensez qu’il s’agit d’une erreur.` });
    }

    // Marquer le code comme utilisé
    await db.marquerCodeUtilise(invite.code_secret, ip);
    await db.logSecurite('connexion', code_secret, nom, ip, 'Connexion réussie');

    // Alerte par email à l'admin
    envoyerAlerteConnexion(invite.nom, code_secret, ip);

    ensureQrCode(invite, getRequestBaseUrl(req)).catch(err => console.error('[QR] Erreur génération:', err.message));

    // Sauvegarder la session
    req.session.invite = {
      code_secret: invite.code_secret,
      nom:         invite.nom,
      table_num:   invite.table_num,
      nb_couverts: invite.nb_couverts,
      menu:        invite.menu,
      boisson:     invite.boisson,
      statut:      invite.statut
    };

    res.json({ ok: true, redirect: '/invitation' });
  }
);

// GET /api/moi — Données de l'invité connecté
app.get('/api/moi', requireInvite, async (req, res) => {
  // Recharger depuis la BDD pour avoir le statut à jour
  const invite = await db.findInvite(req.session.invite.code_secret);
  res.json(invite);
});

app.get('/api/boissons', requireInvite, (req, res) => {
  res.json({ boissons: BOISSON_CHOIX_OPTIONS, eauAutomatique: true });
});

// POST /api/repondre — Accepter ou refuser
app.post('/api/repondre', requireInvite, apiLimiter,
  body('statut').isIn(['accepte', 'refuse']).withMessage('Statut invalide'),
  body('boisson').optional({ values: 'falsy' }).trim().isLength({ min: 1, max: 200 }).withMessage('Boisson invalide'),
  validateInput,
  async (req, res) => {
  const { statut } = req.body;
  const boisson = String(req.body.boisson || '').trim();
  if (!['accepte', 'refuse'].includes(statut)) {
    return res.status(400).json({ erreur: 'Statut invalide.' });
  }

  const invite = await db.findInvite(req.session.invite.code_secret);

  if (statut === 'accepte' && !areValidBoissons(boisson, invite.nb_couverts)) {
    const expected = Math.max(1, Number(invite.nb_couverts || 1));
    return res.status(400).json({ erreur: expected > 1 ? `Veuillez choisir ${expected} boissons avant de confirmer votre présence. L'eau est prévue automatiquement.` : `Veuillez choisir une boisson avant de confirmer votre présence. L'eau est prévue automatiquement.` });
  }
  // Validation de boisson rendue optionnelle car l'eau est prévue

  if (invite.statut !== 'en_attente') {
    return res.status(400).json({ erreur: 'Vous avez déjà répondu.' });
  }

  const updateResult = await db.enregistrerReponse(invite.code_secret, statut, statut === 'accepte' ? boisson : null);
  if (updateResult.rowCount !== 1) {
    return res.status(500).json({ erreur: 'La réponse n’a pas été enregistrée dans la base de données.' });
  }
  const updatedInvite = updateResult.rows[0] || {
    ...invite,
    statut,
    boisson: statut === 'accepte' ? boisson : null
  };
  req.session.invite = {
    ...req.session.invite,
    statut: updatedInvite.statut,
    boisson: updatedInvite.boisson
  };

  // Notification WhatsApp
  const msg = statut === 'accepte' ? wa.msgAcceptation(updatedInvite) : wa.msgRefus(updatedInvite);
  const notif = await wa.envoyerNotification(msg);
  if (!notif.ok) console.error('[WhatsApp] Notification non envoyée:', notif.raison);

  res.json({ ok: true, statut });
});

// GET /api/qrcode/:code — Génère le QR code à la volée (image PNG base64)
app.get('/api/qrcode/:code', requireInvite, async (req, res) => {
  const invite = req.session.invite;
  if (invite.code_secret !== req.params.code.toUpperCase()) {
    return res.status(403).json({ erreur: 'Accès interdit.' });
  }

  const fullInvite = await db.findInvite(invite.code_secret);
  const baseUrl = getRequestBaseUrl(req);
  const url = qrUrl(fullInvite, baseUrl);

  try {
    const filePath = await ensureQrCode(fullInvite, baseUrl);
    const qrDataUrl = `data:image/png;base64,${fs.readFileSync(filePath).toString('base64')}`;
    res.json({ ok: true, qr: qrDataUrl, url, file: `/qrcodes/${fullInvite.code_secret}.png` });
  } catch (err) {
    res.status(500).json({ erreur: 'Erreur génération QR.' });
  }
});

// GET /api/invitation-physique/:code — Données publiques pour une invitation imprimable
app.get('/api/invitation-physique/:code', async (req, res) => {
  const code = String(req.params.code || '').trim().toUpperCase();
  if (!code) return res.status(400).json({ ok: false, erreur: 'Code requis.' });

  const invite = await db.findInvite(code);
  if (!invite) {
    return res.status(404).json({ ok: false, erreur: 'Invitation introuvable.' });
  }

  const baseUrl = getRequestBaseUrl(req);
  res.json({
    ok: true,
    invite: await publicInvitationPayload(invite, baseUrl)
  });
});

// POST /api/invitation-physique/verifier — Recherche publique par nom + table
app.post('/api/invitation-physique/verifier', apiLimiter,
  body('nom').trim().isLength({ min: 1, max: 100 }).withMessage('Nom invalide'),
  body('table_num').isInt({ min: 0 }).withMessage('Numéro de table invalide'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ ok: false, erreur: errors.array()[0].msg });
    }

    const nom = String(req.body.nom || '').trim();
    const tableNum = Number(req.body.table_num);

    const invite = await db.findInviteByNameTable(nom, tableNum);
    if (!invite) {
      return res.status(404).json({
        ok: false,
        erreur: 'Informations non reconnues. Vérifiez le nom complet et le numéro de table.'
      });
    }

    const baseUrl = getRequestBaseUrl(req);
    res.json({
      ok: true,
      invite: await publicInvitationPayload(invite, baseUrl)
    });
  }
);

// GET /api/deconnexion
app.get('/api/deconnexion', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
});

// ============================================
// API SCANNER (accueil le jour J)
// ============================================

// GET /valider-entree?code=YC01&table=5
// Appelé par le scan du QR code
app.get('/valider-entree', (req, res) => {
  res.redirect(`/scanner?code=${req.query.code || ''}`);
});

// POST /api/scanner/valider — Validation réelle
app.post('/api/scanner/login', apiLimiter,
  body('password').isLength({ min: 1 }).withMessage('Mot de passe requis'),
  validateInput,
  (req, res) => {
    const { password } = req.body;
    try {
      if (!timingSafeCompare(password, SCANNER_TOKEN)) {
        return res.status(401).json({ erreur: 'Mot de passe scanner incorrect.' });
      }
    } catch (err) {
      return res.status(401).json({ erreur: 'Mot de passe scanner incorrect.' });
    }
    req.session.scanner = true;
    res.json({ ok: true });
  }
);

app.get('/api/scanner/login', apiLimiter, (req, res) => {
  const password = String(req.query.password || '');
  try {
    if (!timingSafeCompare(password, SCANNER_TOKEN)) {
      return res.status(401).json({ erreur: 'Mot de passe scanner incorrect.' });
    }
  } catch (err) {
    return res.status(401).json({ erreur: 'Mot de passe scanner incorrect.' });
  }
  req.session.scanner = true;
  res.json({ ok: true });
});

app.get('/scanner-auth', apiLimiter, (req, res) => {
  const password = String(req.query.password || '');
  const code = String(req.query.code || '').trim();
  try {
    if (!timingSafeCompare(password, SCANNER_TOKEN)) {
      return res.redirect(`/scanner?${new URLSearchParams({ code, erreur: 'Mot de passe scanner incorrect.' }).toString()}`);
    }
  } catch (err) {
    return res.redirect(`/scanner?${new URLSearchParams({ code, erreur: 'Mot de passe scanner incorrect.' }).toString()}`);
  }
  req.session.scanner = true;
  res.redirect(`/scanner?${new URLSearchParams({ code }).toString()}`);
});

app.post('/api/scanner/valider', requireScanner, async (req, res) => {
  const { code_secret } = req.body;

  if (!code_secret) return res.status(400).json({ erreur: 'Code requis.' });

  const code = code_secret.trim().toUpperCase();
  const invite = await db.findInvite(code);
  const ip = getIp(req);

  if (!invite) {
    await db.logSecurite('scan_inconnu', code, null, ip, 'Scanner : Code non reconnu');
    return res.status(404).json({ resultat: 'inconnu', message: 'Code non reconnu.' });
  }

  if (invite.presente) {
    await db.logSecurite('scan_deja_valide', code, invite.nom, ip, 'Scanner : Invité déjà présent');
    return res.json({
      resultat: 'deja_entre',
      message: `${invite.nom} est déjà enregistré(e).`,
      invite: { nom: invite.nom, table_num: invite.table_num, menu: invite.menu, boisson: invite.boisson }
    });
  }

  if (invite.statut === 'refuse') {
    await db.logSecurite('scan_refuse', code, invite.nom, ip, 'Scanner : Invitation déclinée');
    return res.json({
      resultat: 'refuse',
      message: `${invite.nom} a décliné l'invitation.`
    });
  }

  // Valider la présence
  const updateResult = await db.validerPresence(invite.code_secret);
  if (updateResult.rowCount !== 1) {
    return res.status(500).json({ resultat: 'erreur', message: 'La présence n’a pas été enregistrée dans la base de données.' });
  }
  const updatedInvite = updateResult.rows[0] || invite;
  await db.logSecurite('scan_valide', code, updatedInvite.nom, ip, 'Scanner : Entrée validée avec succès');
  wa.envoyerNotification(wa.msgEntreeValidee(updatedInvite));

  res.json({
    resultat: 'valide',
    message: `Bienvenue, ${updatedInvite.nom} !`,
    invite: {
      nom:         updatedInvite.nom,
      table_num:   updatedInvite.table_num,
      nb_couverts: updatedInvite.nb_couverts,
      menu:        updatedInvite.menu,
      boisson:     updatedInvite.boisson,
      code_secret: updatedInvite.code_secret
    }
  });
});

app.post('/api/scanner/stats', requireScanner, async (req, res) => {
  res.json(await db.getStats());
});

app.get('/api/scanner/logout', (req, res) => {
  req.session.scanner = false;
  res.redirect('/scanner');
});

// ============================================
// API SERVEURS (station boissons)
// ============================================

app.post('/api/serveurs/login', apiLimiter,
  body('password').isLength({ min: 1 }).withMessage('Mot de passe requis'),
  validateInput,
  (req, res) => {
    const { password } = req.body;
    try {
      if (!timingSafeCompare(password, SERVEUR_PASSWORD)) {
        return res.status(401).json({ erreur: 'Mot de passe serveur incorrect.' });
      }
    } catch (err) {
      return res.status(401).json({ erreur: 'Mot de passe serveur incorrect.' });
    }
    req.session.serveur = true;
    res.json({ ok: true });
  }
);

app.get('/api/serveurs/dashboard', requireServeur, async (req, res) => {
  const invites = await db.getServeurDashboard();
  const tables = new Map();

  for (const invite of invites) {
    const tableKey = String(invite.table_num || 'Sans table');
    if (!tables.has(tableKey)) {
      tables.set(tableKey, {
        table_num: invite.table_num || null,
        table_label: invite.table_num ? `Table ${invite.table_num}` : 'Sans table',
        invites: [],
        boissons: {}
      });
    }

    const table = tables.get(tableKey);
    const boisson = String(invite.boisson || 'Non choisie').trim();
    table.boissons[boisson] = (table.boissons[boisson] || 0) + 1;
    table.invites.push({
      id: invite.id,
      nom: invite.nom,
      code_secret: invite.code_secret,
      table_num: invite.table_num,
      nb_couverts: invite.nb_couverts,
      menu: invite.menu,
      boisson,
      date_presence: invite.date_presence
    });
  }

  res.json({
    ok: true,
    updated_at: new Date().toISOString(),
    total_arrives: invites.length,
    tables: Array.from(tables.values())
  });
});

app.get('/api/serveurs/logout', (req, res) => {
  req.session.serveur = false;
  res.redirect('/serveurs');
});

// ============================================
// API ADMIN
// ============================================

app.post('/api/admin/login', adminLimiter,
  body('password').isLength({ min: 1 }).withMessage('Mot de passe requis'),
  validateInput,
  (req, res) => {
    const { password } = req.body;
    try {
      if (!timingSafeCompare(password, ADMIN_PASSWORD)) {
        return res.status(401).json({ erreur: 'Mot de passe incorrect.' });
      }
    } catch (err) {
      return res.status(401).json({ erreur: 'Mot de passe incorrect.' });
    }
    req.session.admin = true;
    res.json({ ok: true });
  }
);

app.get('/api/admin/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.redirect('/admin');
  });
});

app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  res.json(await db.getStats());
});

app.get('/api/admin/invites', requireAdmin, async (req, res) => {
  res.json(await db.getAllInvites());
});

app.get('/api/admin/public-url', requireAdmin, (req, res) => {
  const baseUrl = getRequestBaseUrl(req);
  res.json({
    baseUrl,
    inviteUrl: `${baseUrl}/`,
    localWarning: /localhost|127\.0\.0\.1|\.local|^https?:\/\/(10\.|172\.(1[6-9]|2\d|3[0-1])\.|192\.168\.)/.test(baseUrl)
  });
});

app.post('/api/admin/invites', requireAdmin, apiLimiter,
  body('nom').trim().isLength({ min: 1, max: 100 }).withMessage('Nom invalide'),
  body('code_secret').optional().trim().isLength({ min: 4, max: 10 }).withMessage('Code invalide'),
  body('table_num').optional().isInt({ min: 0 }).withMessage('Numéro table invalide'),
  body('nb_couverts').optional().isInt({ min: 1, max: 10 }).withMessage('Couverts invalides'),
  body('menu').optional().isIn(['standard', 'vegetarien', 'vegan']).withMessage('Menu invalide'),
  validateInput,
  async (req, res) => {
  const nom = String(req.body.nom || '').trim();
  const code_secret = String(req.body.code_secret || await nextInviteCode()).trim().toUpperCase();
  const table_num = Number(req.body.table_num || 0);
  const nb_couverts = Number(req.body.nb_couverts || 1);
  const menu = String(req.body.menu || 'standard').trim();

  if (!nom) return res.status(400).json({ erreur: 'Nom requis.' });
  if (await db.codeExists(code_secret)) return res.status(409).json({ erreur: 'Ce code existe déjà.' });

  const result = await db.createInvite({ nom, code_secret, table_num, nb_couverts, menu });
  res.json({ ok: true, id: result.lastInsertRowid, code_secret });
});

app.put('/api/admin/invites/:id', requireAdmin, async (req, res) => {
  const current = await db.findInviteById(req.params.id);
  if (!current) return res.status(404).json({ erreur: 'Invité introuvable.' });
  await db.updateInvite(req.params.id, {
    nom: String(req.body.nom || current.nom).trim(),
    table_num: Number(req.body.table_num ?? current.table_num),
    nb_couverts: Number(req.body.nb_couverts ?? current.nb_couverts),
    menu: String(req.body.menu || current.menu).trim(),
    boisson: String(req.body.boisson ?? current.boisson ?? '').trim() || null,
    statut: String(req.body.statut || current.statut),
  });
  res.json({ ok: true });
});

app.delete('/api/admin/invites/:id', requireAdmin, async (req, res) => {
  const current = await db.findInviteById(req.params.id);
  if (!current) return res.status(404).json({ erreur: 'Invité introuvable.' });
  await db.deleteInvite(req.params.id);
  res.json({ ok: true });
});

app.post('/api/admin/invites/:id/reset-code', requireAdmin, async (req, res) => {
  const current = await db.findInviteById(req.params.id);
  if (!current) return res.status(404).json({ erreur: 'Invité introuvable.' });
  const newCode = String(req.body.code_secret || await nextInviteCode()).trim().toUpperCase();
  if (await db.codeExists(newCode)) return res.status(409).json({ erreur: 'Ce code existe déjà.' });
  await db.resetInviteCode(req.params.id, newCode);
  res.json({ ok: true, code_secret: newCode });
});

app.get('/api/admin/logs', requireAdmin, async (req, res) => {
  res.json(await db.getLogsSecurite());
});

// Export CSV
app.get('/api/admin/export-csv', requireAdmin, async (req, res) => {
  const invites = await db.getAllInvites();
  const header = ['ID','Nom','Code','Table','Couverts','Menu','Boisson','Statut','Accès','Présent','IP','Date réponse','Date présence'];
  const rows = invites.map(i => [
    i.id, `"${i.nom}"`, i.code_secret, i.table_num, i.nb_couverts, i.menu, `"${i.boisson || ''}"`,
    i.statut, `${i.acces_count || 0}/${MAX_INVITE_ACCES}`, i.presente ? 'oui' : 'non',
    i.ip_connexion || '', i.date_reponse || '', i.date_presence || ''
  ]);
  const csv = [header, ...rows].map(r => r.join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="invites_mariage.csv"');
  res.send('\uFEFF' + csv); // BOM UTF-8 pour Excel
});

// Token scanner (pour sécuriser le scanner sans session)
app.get('/api/admin/scanner-token', requireAdmin, (req, res) => {
  res.json({ token: SCANNER_TOKEN });
});

// ============================================
// DÉMARRAGE
// ============================================

async function startServer() {
  await db.initDb();

  if (USE_HTTPS) {
    const credentials = getHttpsCredentials();
    const localIp = getLocalIp();
    https.createServer(credentials, app).listen(PORT, BIND_HOST, () => {
      console.log('\n[DEMARRAGE] Système mariage Yannick & Chantia démarré en HTTPS !');
      console.log(`[WEB] Local          : https://${DISPLAY_HOST}:${PORT}`);
      console.log(`[WEB] Réseau local   : https://${localIp}:${PORT}`);
      console.log(`[ADMIN] Admin local  : https://${DISPLAY_HOST}:${PORT}/admin`);
      console.log(`[ADMIN] Admin réseau : https://${localIp}:${PORT}/admin`);
      console.log(`\nMot de passe admin : ${ADMIN_PASSWORD}`);
      console.log(`\nA envoyer aux invités : ${SITE_URL.replace(/\/+$/, '')}`);
    });
  } else {
    const localIp = getLocalIp();
    app.listen(PORT, BIND_HOST, () => {
      console.log('\n[DEMARRAGE] Système mariage Yannick & Chantia démarré !');
      console.log(`[WEB] Local          : http://${DISPLAY_HOST}:${PORT}`);
      console.log(`[WEB] Réseau local   : http://${localIp}:${PORT}`);
      console.log(`[ADMIN] Admin local  : http://${DISPLAY_HOST}:${PORT}/admin`);
      console.log(`[ADMIN] Admin réseau : http://${localIp}:${PORT}/admin`);
      console.log(`\nMot de passe admin : ${ADMIN_PASSWORD}`);
      console.log(`\nA envoyer aux invités : ${SITE_URL.replace(/\/+$/, '')}`);
    });
  }
}

startServer().catch((err) => {
  console.error('[DEMARRAGE] Impossible de lancer le serveur:', db.formatDbError(err));
  process.exit(1);
});
