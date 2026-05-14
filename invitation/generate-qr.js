// generate-qr.js
// Génère les QR codes pour tous les invités ayant accepté
// Lancer avec : node generate-qr.js

require('dotenv').config();
const QRCode = require('qrcode');
const path   = require('path');
const fs     = require('fs');
const db     = require('./db');

const QR_DIR  = path.join(__dirname, 'qrcodes');
const SITE_URL = (process.env.SITE_URL || 'http://localhost:3000').replace(/\/+$/, '');

if (!fs.existsSync(QR_DIR)) fs.mkdirSync(QR_DIR, { recursive: true });

async function genererQRCode(invite) {
  const params = new URLSearchParams({
    code: invite.code_secret,
    nom: invite.nom,
    table: String(invite.table_num || ''),
  });
  const url = `${SITE_URL}/valider-entree?${params.toString()}`;
  const fichier = path.join(QR_DIR, `${invite.code_secret}.png`);

  await QRCode.toFile(fichier, url, {
    width: 400,
    margin: 2,
    color: { dark: '#2C1F1F', light: '#FAF7F2' },
    errorCorrectionLevel: 'H'
  });

  return { code: invite.code_secret, nom: invite.nom, fichier, url };
}

async function main() {
  if (/localhost|127\.0\.0\.1|\.local|^https?:\/\/(10\.|172\.(1[6-9]|2\d|3[0-1])\.|192\.168\.)/.test(SITE_URL)) {
    console.warn(`[ATTENTION] SITE_URL semble local (${SITE_URL}). Ces QR codes ne fonctionneront pas pour des invites hors du meme reseau.`);
  }

  await db.initDb();
  const tous = await db.getAllInvites();
  const aGenerer = tous; // Génère pour tous (pas seulement les acceptés)

  console.log(`\n[QR] Génération des QR codes pour ${aGenerer.length} invité(s)...\n`);

  for (const invite of aGenerer) {
    try {
      const res = await genererQRCode(invite);
      console.log(`[OK] ${res.code} — ${res.nom}`);
      console.log(`   → ${res.fichier}`);
    } catch (err) {
      console.error(`[ERREUR] Erreur pour ${invite.code_secret}:`, err.message);
    }
  }

  console.log('\n[TERMINE] Terminé ! Les QR codes sont dans le dossier /qrcodes/');
}

main()
  .catch((err) => {
    console.error('[ERREUR] Generation QR impossible:', err.message);
    process.exitCode = 1;
  })
  .finally(() => db.close());
