-- Migración: sistema de clubs de percusión
-- Ejecutar en Supabase SQL Editor

CREATE TABLE clubs (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  monthly_amount INTEGER NOT NULL,
  admin_email    TEXT NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE club_members (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  club_id             TEXT REFERENCES clubs(id),
  email               TEXT NOT NULL,
  display_name        TEXT,
  active_until        TIMESTAMPTZ,
  mp_payer_id         TEXT,
  mp_subscription_id  TEXT,
  updated_at          TIMESTAMPTZ DEFAULT now(),
  UNIQUE(club_id, email)
);

-- Seed: club "Qué le pasa a María?"
INSERT INTO clubs (id, name, monthly_amount, admin_email)
VALUES ('qlpm', 'Qué le pasa a María?', 2500, 'danielpugliese22@gmail.com');

-- Miembros ficticios — reemplazar con emails reales desde Supabase
INSERT INTO club_members (club_id, email, display_name)
VALUES
  ('qlpm', 'miembro1@example.com', 'Ejemplo Uno'),
  ('qlpm', 'miembro2@example.com', 'Ejemplo Dos'),
  ('qlpm', 'miembro3@example.com', 'Ejemplo Tres');
