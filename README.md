# Invitation Mariage

Deux versions du projet sont présentes dans ce dépôt :

- `invitation 1` : première version de l'invitation
- `invitation 2` : version plus récente avec carte, QR codes et gestion serveur

## Fonctionnalités

- Pages d'invitation personnalisées
- QR code d'accès
- Confirmation de présence
- Carte Google Maps pour le lieu
- Envoi d'e-mails de notification
- Gestion serveur Express

## Structure

- `invitation 1/`
- `invitation 2/`

Chaque dossier contient son propre serveur, ses pages HTML et ses fichiers de configuration.

## Lancer en local

Dans chaque dossier :

```bash
npm install
npm start
```

Si tu utilises le mode développement :

```bash
npm run dev
```

## Configuration `.env`

Chaque projet utilise son propre fichier `.env`.

Variables importantes :

- `PORT`
- `BIND_HOST`
- `DISPLAY_HOST`
- `SITE_URL`
- `DATABASE_URL`
- `SESSION_SECRET`
- `ADMIN_PASSWORD`
- `SCANNER_TOKEN`
- `SERVEUR_PASSWORD`

### E-mail

Pour l'envoi de mails, configure :

- `MAIL_USER`
- `MAIL_PASS`
- `MAIL_FROM`
- `ADMIN_EMAIL`

Optionnel :

- `MAIL_HOST`
- `MAIL_PORT`
- `MAIL_SECURE`
- `MAIL_SERVICE`

Exemple Gmail :

```env
MAIL_USER=gragralulu31@gmail.com
MAIL_PASS=mot_de_passe_application
MAIL_FROM="Système Mariage <gragralulu31@gmail.com>"
ADMIN_EMAIL=gragralulu31@gmail.com
MAIL_SERVICE=gmail
```

Important :

- Gmail demande un mot de passe d'application
- Si tu obtiens une erreur `535-5.7.8 Username and Password not accepted`, il faut régénérer le mot de passe d'application ou vérifier l'adresse d'envoi

## Carte et itinéraire

Dans l'invitation civile, le bouton d'itinéraire ouvre Google Maps en demandant la position du navigateur au clic.  
Si la localisation est refusée, la carte reste disponible comme secours.

## Déploiement

Le projet est prévu pour Render.

Points à vérifier avant déploiement :

- base PostgreSQL correctement configurée
- variables d'environnement renseignées
- mot de passe admin fort
- secret de session unique

## Notes

- Ne versionne jamais les secrets réels dans le dépôt
- Garde les mots de passe Gmail dans `.env`, pas dans `.env.example`
- Si tu modifies les données du lieu, pense à mettre à jour le lien Maps et la carte intégrée

