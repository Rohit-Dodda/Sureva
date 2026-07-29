-- Elevation of the session, in metres above the WGS 84 ellipsoid, read from the
-- phone's GPS at session start (the wearable has no barometer). Drives the
-- Altitude Ace badge — see maxAltitudeM in App/services/AchievementService.js.
--
-- Null whenever location permission was denied, or the fix came back without a
-- usable altitude: GPS altitude is much noisier than horizontal position, so
-- LocationService discards readings whose stated altitudeAccuracy is poor
-- rather than banking a number it doesn't trust. Additive only — see schema.sql
-- for the full picture.

alter table public.sessions add column if not exists altitude_m numeric;
