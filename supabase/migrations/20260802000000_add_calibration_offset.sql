-- Real, persisted alert-threshold nudge derived from repeated post-session
-- survey signals — see PersonalCalibrationService.js's computeCalibrationOffset
-- and updatePersonalFactor's own precedent for the null/default convention.
-- Distinct from personal_factor: that one is the BLE-gated global depletion-
-- rate learner (still dormant pre-hardware); this one is driven by the
-- post_session_checkins.barrier_modifier survey signal, needs no hardware,
-- and only ever tightens (adds to) the alert threshold, never loosens it —
-- additive-only per CLAUDE.md's "when in doubt, be conservative" rule.
-- Default 0 (not null) since "no signal yet" and "neutral" are the same
-- state here, unlike personal_factor's multiplicative null-means-1.0 case.

alter table public.users add column if not exists calibration_offset numeric default 0;
