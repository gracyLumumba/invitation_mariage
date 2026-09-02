# Invitation Anniversaire

Petit site autonome pour l'anniversaire de Lucé Tshibola.

## Ce que contient le dossier

- `login.html` : connexion par nom seulement
- `invitation.html` : invitation + confirmation de présence
- `admin.html` : tableau de bord admin
- `server.js` : serveur Express + stockage JSON local
- `chanson anniversaire.mpeg` : musique

## Lancer en local

```bash
npm install
npm start
```

Puis ouvrir:

```text
http://localhost:3000
```

## Déploiement Render

- Crée un nouveau Web Service depuis ce dossier
- Build command: `npm install`
- Start command: `npm start`
- Ajoute une variable d'environnement:
  - `ADMIN_PASSWORD`

## Supabase / PostgreSQL

Le fichier `supabase.sql` contient le schéma à copier dans l'éditeur SQL de Supabase.

Étapes:

1. Crée un projet Supabase.
2. Ouvre l'éditeur SQL.
3. Colle le contenu de `supabase.sql`.
4. Exécute le script.

Ensuite on pourra brancher `server.js` sur `DATABASE_URL` pour remplacer `data.json`.

## Fonctionnement

- Les invités saisissent juste leur nom
- Ils confirment ensuite leur présence dans l'invitation
- L'admin voit la liste des connexions et les confirmations
