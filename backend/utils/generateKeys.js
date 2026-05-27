/**
 * utils/generateKeys.js
 * Génère les paires de clés RSA-2048 pour chaque rôle VAN BTP.
 * Usage : npm run generate-keys
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const roles = ['Directeur technique', 'Chef_chantier', 'Gerant_production', 'Gestionnaire de stocks'];

const ROLE_KEY_DIRS = {
  'Directeur technique': 'directeur_technique',
  'Gestionnaire de stocks': 'gerant_stock',
};

roles.forEach(role => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding:  { type: 'spki',  format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  const dir = path.join(__dirname, '../.private', ROLE_KEY_DIRS[role] ?? role.toLowerCase());
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (!fs.existsSync(path.join(dir, 'public.pem'))) {
    fs.writeFileSync(path.join(dir, 'public.pem'),  publicKey);
    fs.writeFileSync(path.join(dir, 'private.pem'), privateKey);
    console.log(`✓ Clés RSA générées pour le rôle : ${role}`);
  } else {
    console.log(`- Clés RSA existantes pour le rôle : ${role} (non écrasées)`);
  }
});

console.log('\nToutes les clés ont été générées dans .private/');
