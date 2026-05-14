
# Guide rapide - Render + Supabase

## 1. Creer la base Supabase

1. Aller sur https://supabase.com
2. Creer un projet gratuit.
3. Aller dans **Project Settings -> Database**.
4. Copier la connection string PostgreSQL.
5. Remplacer `[YOUR-PASSWORD]` par le mot de passe de la base.

Elle ressemble a :

```text
postgresql://postgres:VOTRE_MOT_DE_PASSE@db.xxxxx.supabase.co:5432/postgres
```

## 2. Deployer sur Render

1. Aller sur https://dashboard.render.com
2. Cliquer **New -> Web Service**
3. Choisir le repo `invitation_yann`
4. Configurer :

```text
Name: invitation-mariage
Root Directory: invitation
Runtime: Node
Build Command: npm install && npm run build
Start Command: npm start
```

## 3. Variables Render

Dans Render -> Environment, ajouter :

```text
HTTPS=false
PORT=3000
BIND_HOST=0.0.0.0
DB_SSL=true
DATABASE_URL=postgresql://...depuis Supabase...
DISPLAY_HOST=<ton-app>.onrender.com
SITE_URL=https://<ton-app>.onrender.com
ADMIN_PASSWORD=<mot de passe admin fort>
SCANNER_TOKEN=<token fort>
SESSION_SECRET=<secret fort>
```

Pour generer les secrets :

```bash
node generate-secrets.js
```

## 4. Liens

App :

```text
https://<ton-app>.onrender.com
```

Admin :

```text
https://<ton-app>.onrender.com/admin
```

Invite direct :

```text
https://<ton-app>.onrender.com/i/YC05
```

## Notes

- Render heberge le site.
- Supabase garde les invites, reponses et presences.
- `npm run build` lance `node init.js`, donc les tables sont creees automatiquement.
- Pour remplir la demo : `npm run seed-demo`.
