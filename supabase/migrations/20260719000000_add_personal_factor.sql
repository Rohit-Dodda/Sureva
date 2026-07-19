-- Adds the real, persisted personal-learning multiplier — see
-- updatePersonalFactor in Algorithm/js/depletionEngine.js. Additive only —
-- see schema.sql for the full picture.

alter table public.users add column if not exists personal_factor numeric;
