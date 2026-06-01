#!/usr/bin/env node
/**
 * Vérification de configuration pour production
 * Exécuté avant le déploiement
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Vérification de la configuration...\n');

const checks = [
  {
    name: 'package.json existant',
    test: () => fs.existsSync(path.join(__dirname, 'package.json'))
  },
  {
    name: '.env.example existant',
    test: () => fs.existsSync(path.join(__dirname, '.env.example'))
  },
  {
    name: 'render.yaml existant',
    test: () => fs.existsSync(path.join(__dirname, 'render.yaml'))
  },
  {
    name: 'server.js existant',
    test: () => fs.existsSync(path.join(__dirname, 'server.js'))
  },
  {
    name: 'db.js existant',
    test: () => fs.existsSync(path.join(__dirname, 'db.js'))
  }
];

let passed = 0;
let failed = 0;

for (const check of checks) {
  try {
    if (check.test()) {
      console.log(`✅ ${check.name}`);
      passed++;
    } else {
      console.log(`❌ ${check.name}`);
      failed++;
    }
  } catch (err) {
    console.log(`❌ ${check.name} - ${err.message}`);
    failed++;
  }
}

console.log(`\n${passed} / ${checks.length} vérifications réussies.`);

if (failed > 0) {
  console.log('\n⚠️  Certaines vérifications ont échoué.');
  process.exit(1);
} else {
  console.log('\n✅ Configuration OK pour le déploiement !');
  process.exit(0);
}
