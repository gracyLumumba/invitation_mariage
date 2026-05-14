// generate-qr.js
// Génère les QR codes pour tous les invités ayant accepté
// Lancer avec : node generate-qr.js

require('dotenv').config();
const QRCode = require('qrcode');
const path   = require('path');
const fs     = require('fs');
const db     = require('./db');

const QR_DIR  = path.join(__dirname, 'qrcodes');
const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';

if (!fs.existsSync(QR_DIR)) fs.mkdirSync(QR_DIR, { recursive: true });

async function genererQRCode(invite) {
  const url = `${SITE_URL}/valider-entree?code=${invite.code_secret}&table=${invite.table_num}`;
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
  const tous = db.getAllInvites();
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

main();
