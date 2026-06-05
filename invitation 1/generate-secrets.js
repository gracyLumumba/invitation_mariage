#!/usr/bin/env node
// generate-secrets.js — Génère des clés de sécurité aléatoires

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log('🔐 Génération des secrets de sécurité...\n');

const secrets = {
  ADMIN_PASSWORD: crypto.randomBytes(32).toString('hex'),
  SCANNER_TOKEN: crypto.randomBytes(32).toString('hex'),
  SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
};

const envContent = `# ===================================
# Configuration HTTPS
# ===================================
HTTPS=true
PORT=3000
BIND_HOST=0.0.0.0
DISPLAY_HOST=localhost

# ===================================
# SÉCURITÉ - Générées automatiquement
# ===================================
ADMIN_PASSWORD=${secrets.ADMIN_PASSWORD}
SCANNER_TOKEN=${secrets.SCANNER_TOKEN}
SESSION_SECRET=${secrets.SESSION_SECRET}
GMAIL_APP_PASSWORD=zosbctqewsqsylru

# ===================================
# Site URL - À personnaliser
# ===================================
SITE_URL=https://192.168.11.104:3000

# ===================================
# WhatsApp (optionnel)
# ===================================
# WHATSAPP_PHONE=...
# WHATSAPP_TOKEN=...
`;

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  console.log('⚠️  .env existe déjà. Sauvegarde en .env.backup');
  fs.copyFileSync(envPath, path.join(__dirname, '.env.backup'));
}

fs.writeFileSync(envPath, envContent, 'utf8');
console.log('✅ Fichier .env créé avec succès !\n');
console.log('📋 Credentials générés:');
console.log(`   ADMIN_PASSWORD:  ${secrets.ADMIN_PASSWORD.substring(0, 16)}...`);
console.log(`   SCANNER_TOKEN:   ${secrets.SCANNER_TOKEN.substring(0, 16)}...`);
console.log(`   SESSION_SECRET:  ${secrets.SESSION_SECRET.substring(0, 16)}...\n`);
console.log('⚠️  N\'oublie pas de mettre à jour SITE_URL avec ton adresse IP réelle !');
console.log('💾 Fichier .env stocké en toute sécurité (ne pas committer sur GitHub)');
