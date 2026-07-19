-- Adds the columns introduced alongside real session persistence
-- (SessionDetailMapper.js / ActiveSessionScreen.js) and the Skin Age
-- exact-age input. Additive only — see schema.sql for the full picture.

alter table public.users add column if not exists exact_age integer;

alter table public.sessions add column if not exists environment text;
alter table public.sessions add column if not exists average_depletion_rate numeric;
alter table public.sessions add column if not exists unprotected_minutes numeric;
alter table public.sessions add column if not exists city text;
alter table public.sessions add column if not exists region text;
