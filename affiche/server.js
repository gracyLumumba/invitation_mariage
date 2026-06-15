const express = require('express');
const path = require('path');
const os = require('os');
const app = express();

// Utilisation du port 3002 pour ne pas interférer avec les autres serveurs du projet
const PORT = 3002;

function getLocalIp() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return 'localhost';
}

// Sert les fichiers statiques (HTML et images) présents dans le dossier 'affiche'
app.use(express.static(__dirname));

// Route par défaut pour charger l'affiche
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'save-the-date-gabriel-sephora.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIp();
  console.log('==================================================');
  console.log('Serveur "Save the Date" (Affiche) démarré !');
  console.log(`Local  : http://localhost:${PORT}`);
  console.log(`Réseau : http://${ip}:${PORT}`);
  console.log('==================================================');
  console.log('Laissez cette fenêtre ouverte pour maintenir le serveur actif.');
});