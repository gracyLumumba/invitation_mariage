# 🚀 Guide Rapide - Déployer sur Render.com

## 1️⃣ Préparer le dépôt GitHub

```bash
cd invitation

# Vérifier que tout est prêt
git status

# S'assurer que .env n'est pas tracké
git rm --cached .env 2>/dev/null || true

# Commit et push
git add .
git commit -m "feat: Configuration pour déploiement Render"
git push origin main
```

## 2️⃣ Générer les secrets (à faire une fois)

**Localement :**
```bash
node generate-secrets.js
```

Cela crée un `.env` avec des credentials aléatoires.

**Copier les valeurs** :
- `ADMIN_PASSWORD`
- `SCANNER_TOKEN`
- `SESSION_SECRET`

## 3️⃣ Déployer sur Render

1. Aller sur https://dashboard.render.com
2. Cliquer **New → Web Service**
3. Choisir le repo `invitation_yann`
4. Configurer :
   ```
   Name: invitation-mariage
   Root Directory: invitation
   Runtime: Node
   Build: npm install && npm run build
   Start: npm start
   ```

## 4️⃣ Ajouter les variables d'environnement

Dans Render Dashboard → Environment → Add Secret:

| Clé | Valeur |
|-----|--------|
| `HTTPS` | `false` |
| `PORT` | `3000` |
| `BIND_HOST` | `0.0.0.0` |
| `DISPLAY_HOST` | `*À compléter après déploiement*` |
| `SITE_URL` | `https://*À compléter après déploiement*` |
| `ADMIN_PASSWORD` | *Depuis generate-secrets.js* |
| `SCANNER_TOKEN` | *Depuis generate-secrets.js* |
| `SESSION_SECRET` | *Depuis generate-secrets.js* |

> **DISPLAY_HOST et SITE_URL** : À remplir après voir l'URL Render (`https://invitation-mariage.onrender.com`)

## 5️⃣ Déployer

Cliquer **Deploy** et attendre 5-10 minutes ☕

---

## ✅ C'est en ligne !

- **App** : `https://invitation-mariage.onrender.com`
- **Admin** : `https://invitation-mariage.onrender.com/admin`
- **Mot de passe** : *Le ADMIN_PASSWORD que tu as configuré*

---

## 📌 Notes importantes

- `.env` n'est **jamais** sur GitHub (`.gitignore` le protège)
- Les secrets sont configurés **uniquement dans Render**
- Le HTTPS est géré **automatiquement par Render**
- La base de données est **persistante** (SAMEAs sur Render)

---

## 🔧 Redéployer après modifications

```bash
# Faire des changements...
git add .
git commit -m "fix: ..."
git push origin main

# Render redéploie automatiquement!
```

---

## 🆘 Problèmes ?

- **Build échoue** : Vérifier les logs Render (Dashboard → Logs)
- **Variables manquantes** : Vérifier Render → Environment
- **Database vide** : Render exécute `npm run build` = `node init.js` auto

---

**Créé pour le mariage Yannick & Chantia** 💍
