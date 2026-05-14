
# Guide rapide - Render + Supabase

## 1. Creer la base Supabase

1. Aller sur https://supabase.com
2. Creer un projet gratuit.
3. Aller dans **Project Settings -> Database**.
4. Cliquer **Connect** puis copier la connection string **Session pooler**.
5. Remplacer `[YOUR-PASSWORD]` par le mot de passe de la base.

Elle ressemble a :

```text
postgresql://postgres.xxxxx:VOTRE_MOT_DE_PASSE@aws-0-region.pooler.supabase.com:5432/postgres
```

Important : ne pas utiliser l'URL directe `db.xxxxx.supabase.co:5432` sur Render si elle donne `ENETUNREACH` avec une adresse IPv6. Le pooler Supabase en mode session est compatible IPv4/IPv6.

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
DATABASE_URL=postgresql://...Session pooler Supabase...
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
- `npm run build` verifie le code sans se connecter a la base, pour eviter un echec reseau pendant le build Render.
- Au demarrage, `npm start` lance `db.initDb()`, donc les tables sont creees automatiquement.
- Pour remplir la demo : `npm run seed-demo`.
