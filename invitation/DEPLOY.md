# 📱 Système d'Invitation - Mariage Yannick & Chantia

Application web sécurisée pour gérer les invitations et le jour du mariage.

---

## 🚀 Déploiement sur Render.com

### Étape 1 : Préparer le GitHub

```bash
# Vérifier que le dépôt est à jour
git status
git add .
git commit -m "Préparation déploiement Render"
git push origin main
```

**Important** : S'assurer que `.env` et `.gitignore` sont corrects :
```
invitation/.env          # PAS sur GitHub
invitation/node_modules/ # PAS sur GitHub
invitation/mariage.db*   # PAS sur GitHub
invitation/qrcodes/      # PAS sur GitHub
```

### Étape 2 : Créer un compte Render

1. Aller sur [render.com](https://render.com)
2. S'inscrire avec GitHub
3. Autoriser Render à accéder à vos dépôts

### Étape 3 : Déployer sur Render

1. Cliquer sur **New +**
2. Sélectionner **Web Service**
3. Choisir le dépôt `invitation_yann`
4. Configurer :
   - **Name** : `invitation-mariage` (ou ce que tu veux)
   - **Runtime** : Node
   - **Build Command** : `npm install && npm run build`
   - **Start Command** : `npm start`

### Étape 4 : Ajouter les variables d'environnement

Dans Render Dashboard → Environment → Add Secret :

```
HTTPS=false
PORT=3000
BIND_HOST=0.0.0.0
DISPLAY_HOST=<ton-app>.onrender.com
SITE_URL=https://<ton-app>.onrender.com

ADMIN_PASSWORD=<généré par generate-secrets.js>
SCANNER_TOKEN=<généré par generate-secrets.js>
SESSION_SECRET=<généré par generate-secrets.js>

WHATSAPP_PHONE=<optionnel>
WHATSAPP_TOKEN=<optionnel>
```

> **Générer les secrets localement** :
> ```bash
> node generate-secrets.js
> ```
> Puis copier les valeurs depuis le `.env` créé.

### Étape 5 : Déployer

Cliquer sur **Deploy** et attendre 5-10 minutes.

L'app sera disponible à `https://<ton-app>.onrender.com`

---

## 📋 Credentials après déploiement

- **Admin URL** : `https://<ton-app>.onrender.com/admin`
- **Mot de passe admin** : `<ADMIN_PASSWORD depuis Render>`
- **Lien invités** : `https://<ton-app>.onrender.com`

---

## ⚙️ Configuration locale (développement)

```bash
# Installer les dépendances
npm install

# Générer les secrets
node generate-secrets.js

# Lancer le serveur HTTPS local
npm run dev
```

Accessible à `https://localhost:3000`

---

## 🔒 Sécurité

- ✅ HTTPS en production (géré par Render)
- ✅ HTTPS en local avec certificats mkcert
- ✅ CSRF Protection
- ✅ Rate Limiting
- ✅ Input Validation & Sanitization
- ✅ Credentials forts (secrets cryptographiques)
- ✅ Session Security (httpOnly, SameSite)
- ✅ Content Security Policy (CSP)

---

## 🐛 Dépannage

### App ne démarre pas

Vérifier les logs Render :
- Dashboard → Logs
- S'assurer que `PORT=3000` est configuré

### Database vide

Au premier déploiement :
```bash
# Connecter via SSH Render ou lancer localement :
npm run init-db
npm run seed-demo
```

### HTTPS ne marche pas

Render gère HTTPS automatiquement. S'assurer que :
- `HTTPS=false` dans les variables (Render gère le SSL)
- `DISPLAY_HOST=<ton-domaine>.onrender.com`
- `SITE_URL=https://<ton-domaine>.onrender.com`

---

## 📞 Support

Pour toute question sur le déploiement :
- 📖 Docs Render : https://render.com/docs
- 🐛 Issues : Crée une issue GitHub

---

**Créé pour le mariage Yannick & Chantia** 💍
