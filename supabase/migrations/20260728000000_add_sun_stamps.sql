-- Sun Stamps — camera captures of the sky, collected into the Atlas board.
--
-- Deliberately independent of `sessions`: a stamp can be caught any time,
-- with no active session and no protection tracking involved. Tying it to a
-- session row would both be wrong (the two are unrelated events) and would
-- gate the feature behind wearing the device, which it must never be.
--
-- The rarity tier and the "why" sentence are STORED, not recomputed on read.
-- Both are derived deterministically by App/services/SunStampService.js at
-- capture time, but the inputs behind them are perishable — the weather
-- baseline and the user's own capture history both move on. Re-deriving a
-- 2024 stamp against 2026's history would silently rewrite what someone
-- already collected, so the recipe is frozen the moment it's caught.

create table public.sun_stamps (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  captured_at timestamp with time zone not null,

  -- Where, and what the sun was doing there. Latitude/longitude are the
  -- capture's own fix, not the user's home.
  latitude numeric not null,
  longitude numeric not null,
  -- Null when the GPS fix carried no trustworthy elevation. NOT the same as
  -- sea level, and must never fill the Sea Level slot — same distinction
  -- sessions.altitude_m already draws for the Altitude Ace badge.
  altitude_m numeric,
  place_name text,

  -- The sun's real position at that instant, in degrees. Printed on the
  -- stamp's plate, so it is user-visible data rather than internal state.
  sun_altitude numeric not null,
  sun_azimuth numeric not null,

  -- Frozen rarity verdict. `tier` drives the art; `reason` is the one
  -- deterministic sentence shown under the card.
  tier text not null check (tier in ('everyday', 'seasonal', 'alignment', 'once')),
  reason text not null,
  dominant_signal text,
  -- Every signal's score, kept for tuning and for explaining a verdict later.
  -- Opaque to the client, which only ever reads `tier` and `reason`.
  signals jsonb,

  -- Which Atlas slots this capture qualified for, resolved at capture time.
  -- Stored rather than recomputed for the same freezing reason as `tier`:
  -- band edges could be retuned later, and a stamp must keep the slots it
  -- was actually collected into.
  axis_place text,
  axis_latitude text,
  axis_altitude text,
  axis_season text,

  created_at timestamp with time zone default now()
);

-- The Atlas reads every stamp a user owns, newest first, on open.
create index sun_stamps_user_captured_idx
  on public.sun_stamps (user_id, captured_at desc);

alter table public.sun_stamps enable row level security;

create policy "Users can only access their own sun stamps"
  on public.sun_stamps for all using (auth.uid() = user_id);
