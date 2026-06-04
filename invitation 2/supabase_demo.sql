-- Nettoyage complet des tables pour l'invitation de Tresor & Laurette
TRUNCATE logs_securite, sessions_admin, invites RESTART IDENTITY;

-- Compatibilite avec une base existante qui n'a pas encore la colonne acces_max
ALTER TABLE invites ADD COLUMN IF NOT EXISTS acces_max INTEGER DEFAULT 3;

-- Insertion des invites demo
-- Note: la colonne "pays" sert ici de champ "table" dans l'application.
INSERT INTO invites (
  nom,
  code_secret,
  pays,
  grace_table_france,
  nb_couverts,
  menu,
  acces_max
)
VALUES
  ('Jean & Marie Dupont', 'TL01', 'France', 'Oui', 2, 'standard', 3),
  ('Luc Bernard', 'TL02', 'France', 'Oui', 1, 'standard', 3),
  ('Anne Rousseau', 'TL03', 'France', 'Oui', 1, 'vegetarien', 3),
  ('Michel & Nicole Leclerc', 'TL04', 'France', 'Oui', 2, 'standard', 3),
  ('Francoise Gerard', 'TL05', 'France', 'Oui', 1, 'standard', 3),
  ('Claude Laurent', 'TL06', 'France', 'Oui', 1, 'standard', 3),
  ('Sylvain Gautier', 'TL07', 'France', 'Oui', 1, 'standard', 3),
  ('Brigitte & Pierre Moreau', 'TL08', 'France', 'Oui', 2, 'standard', 3),
  ('Evelyne Robert', 'TL09', 'France', 'Oui', 1, 'vegetarien', 3),
  ('Olivier & Christine Durand', 'TL10', 'France', 'Oui', 2, 'standard', 3),
  ('Gracy', 'TL11', 'France', 'Oui', 1, 'standard', NULL);

-- Pour faciliter la lecture dans Supabase, on expose seulement les colonnes utiles
CREATE OR REPLACE VIEW invites_resume AS
SELECT
  nom,
  pays AS "table",
  code_secret AS code,
  statut
FROM invites
ORDER BY id;

-- Verification rapide
SELECT
  nom,
  pays AS "table",
  code_secret AS code,
  statut
FROM invites
ORDER BY id;
