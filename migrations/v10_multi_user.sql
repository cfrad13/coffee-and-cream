-- ═══════════════════════════════════════════════════════════════════════════
-- Coffee & Cream — Migration v10
-- Multi-utilisateurs + préparation écran filtre par user
--
-- À exécuter dans le SQL Editor de Supabase Studio.
-- Idempotent : peut être relancé sans casser la DB (IF NOT EXISTS partout).
--
-- Contexte :
--   - La table `users` existe déjà avec 3 rows (Christian, Eric, Perron).
--   - La table `brews` a déjà `user_id` NOT NULL effectif (0 orphelin).
--   - La table `recipes` n'existe PAS — les recettes de base (espresso, chemex,
--     v60, french press) sont en dur dans recipes.js côté front. Seule la
--     table `custom_recipes` est en DB, et elle est VIDE pour l'instant.
--   - Pas de migration par tag à faire : aucune recette existante à rattacher.
-- ═══════════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────────
-- 1. Enrichissement de la table `users`
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS color    text,
  ADD COLUMN IF NOT EXISTS initials text;

-- Valeurs par défaut demandées dans le brief
UPDATE public.users SET color = '#ae5630', initials = 'CH' WHERE name = 'Christian' AND color IS NULL;
UPDATE public.users SET color = '#3b6b4d', initials = 'ER' WHERE name = 'Eric'      AND color IS NULL;
UPDATE public.users SET color = '#8b5a3c', initials = 'PE' WHERE name = 'Perron'    AND color IS NULL;

-- On garde `avatar_emoji` pour rétrocompat mais on ne l'utilise plus côté UI.


-- ───────────────────────────────────────────────────────────────────────────
-- 2. Enrichissement de la table `custom_recipes`
--
-- Colonnes actuelles détectées : id, name (NOT NULL), category, grinder_id,
-- grind_setting, notes, created_at.
-- Colonnes à ajouter pour supporter le modèle multi-user.
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE public.custom_recipes
  ADD COLUMN IF NOT EXISTS user_id        uuid REFERENCES public.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_public      boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS dose_g         numeric,
  ADD COLUMN IF NOT EXISTS ratio          numeric,
  ADD COLUMN IF NOT EXISTS yield_ml       numeric,
  ADD COLUMN IF NOT EXISTS water_temp_c   integer,
  ADD COLUMN IF NOT EXISTS tags           text[] DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS flavor_profile jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS cloned_from    uuid REFERENCES public.custom_recipes(id) ON DELETE SET NULL;

-- Index utiles pour les filtres
CREATE INDEX IF NOT EXISTS idx_custom_recipes_user_id   ON public.custom_recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_recipes_is_public ON public.custom_recipes(is_public);


-- ───────────────────────────────────────────────────────────────────────────
-- 3. Confirmation `brews.user_id` — déjà en place, on verrouille juste
-- ───────────────────────────────────────────────────────────────────────────

-- user_id est déjà rempli sur les 6 rows existants. On pose le NOT NULL
-- si ce n'est pas déjà le cas.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'brews'
      AND column_name = 'user_id' AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE public.brews ALTER COLUMN user_id SET NOT NULL;
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_brews_user_id    ON public.brews(user_id);
CREATE INDEX IF NOT EXISTS idx_brews_created_at ON public.brews(created_at DESC);


-- ───────────────────────────────────────────────────────────────────────────
-- 4. Table `brews` — colonne `extraction_verdict` pour le feedback v10
--
-- Utilisée par l'écran Dégustation pour marquer :
--   'under'  (sous-extrait)
--   'target' (dans la cible)
--   'over'   (sur-extrait)
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE public.brews
  ADD COLUMN IF NOT EXISTS extraction_verdict text
    CHECK (extraction_verdict IN ('under', 'target', 'over'));


-- ───────────────────────────────────────────────────────────────────────────
-- 5. Table `favorites` — rétrocompatibilité
--
-- Colonnes actuelles détectées : id, user_id, recipe_key, created_at.
-- On ajoute des références optionnelles vers brews / custom_recipes pour
-- permettre un favori typé (sinon on retombe sur recipe_key texte pour les
-- recettes du JS statique).
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE public.favorites
  ADD COLUMN IF NOT EXISTS brew_id          uuid REFERENCES public.brews(id)          ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS custom_recipe_id uuid REFERENCES public.custom_recipes(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);


-- ───────────────────────────────────────────────────────────────────────────
-- 6. Row Level Security — on garde le modèle "tout le monde voit tout"
--
-- Les policies publiques existantes ne sont PAS touchées ici. On les laisse
-- telles quelles pour ne rien casser (d'après le contexte v9, RLS est déjà
-- activé avec des policies public read).
-- ───────────────────────────────────────────────────────────────────────────

-- (Rien à faire ici — volontaire.)


-- ───────────────────────────────────────────────────────────────────────────
-- 7. Rapport post-migration
-- ═══════════════════════════════════════════════════════════════════════════

-- Colonnes users
SELECT 'users columns' AS check_name, string_agg(column_name, ', ') AS value
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'users';

-- Users et leur nouvelle config visuelle
SELECT 'users rows' AS check_name, id, name, color, initials FROM public.users ORDER BY name;

-- Brews par user
SELECT 'brews per user' AS check_name, u.name, count(b.id) AS brew_count
FROM public.users u
LEFT JOIN public.brews b ON b.user_id = u.id
GROUP BY u.name
ORDER BY u.name;

-- Brews orphelins (devrait être 0)
SELECT 'orphan brews' AS check_name, count(*) AS count
FROM public.brews
WHERE user_id IS NULL;

-- custom_recipes columns après ALTER
SELECT 'custom_recipes columns' AS check_name, string_agg(column_name, ', ') AS value
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'custom_recipes';

-- favorites columns après ALTER
SELECT 'favorites columns' AS check_name, string_agg(column_name, ', ') AS value
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'favorites';
