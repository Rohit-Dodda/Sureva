-- Adds the "where did you hear about Sureva?" onboarding question
-- (constants/onboardingOptions.js's REFERRAL_SOURCES). Additive only —
-- see schema.sql for the full picture.

alter table public.users add column if not exists referral_source text;
alter table public.users add column if not exists referral_source_other text;
