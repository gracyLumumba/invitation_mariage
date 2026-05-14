# Deploiement public gratuit

Solution choisie : Render pour le site + Supabase PostgreSQL pour la base.

## Supabase

1. Creer un projet sur https://supabase.com
2. Recuperer la connection string PostgreSQL dans **Project Settings -> Database**.
3. Garder le mot de passe de la base sous la main.

## Render

Creer un **Web Service** depuis GitHub :

```text
Root Directory: invitation
Build Command: npm install && npm run build
Start Command: npm start
```

Variables d'environnement :

```text
HTTPS=false
PORT=3000
BIND_HOST=0.0.0.0
DB_SSL=true
DATABASE_URL=postgresql://...depuis Supabase...
DISPLAY_HOST=<ton-app>.onrender.com
SITE_URL=https://<ton-app>.onrender.com
ADMIN_PASSWORD=<mot de passe admin>
SCANNER_TOKEN=<token scanner>
SESSION_SECRET=<secret session>
```

## Liens a envoyer

Site :

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

Le panneau admin contient aussi un bouton `Lien` pour copier le message complet d'un invite.
