-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- USERS TABLE
-- Stores all user profile and onboarding data
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  first_name text,
  last_name text,
  age_range integer,
  skin_tone integer,
  skin_type text,
  burn_rate text,
  medications boolean default false,
  skin_condition boolean default false,
  onboarding_complete boolean default false,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc', now())
);

-- SESSIONS TABLE
-- Stores all UV tracking sessions
create table public.sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone,
  duration_minutes numeric,
  spf integer,
  water_resistance_mins integer,
  placement text,
  activity_level text,
  peak_uv numeric,
  average_uv numeric,
  peak_temperature numeric,
  average_humidity numeric,
  protection_score integer,
  water_events integer default 0,
  alert_count integer default 0,
  alert_response_time_avg numeric,
  reapplication_count integer default 0,
  latitude numeric,
  longitude numeric,
  location_name text,
  created_at timestamp with time zone default timezone('utc', now())
);

-- SESSION READINGS TABLE
-- Stores the raw 30-second algorithm readings for each session
create table public.session_readings (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references public.sessions(id) on delete cascade not null,
  timestamp timestamp with time zone not null,
  uv_index numeric,
  temperature numeric,
  humidity numeric,
  activity_level text,
  protection_percentage numeric,
  depletion_rate numeric,
  water_event boolean default false,
  water_event_type text,
  created_at timestamp with time zone default timezone('utc', now())
);

-- SESSION EVENTS TABLE
-- Stores discrete events within a session (reapplications, alerts, water events)
create table public.session_events (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references public.sessions(id) on delete cascade not null,
  event_type text not null, -- 'reapplication', 'alert_fired', 'alert_confirmed', 'water_event'
  timestamp timestamp with time zone not null,
  protection_at_event numeric,
  response_time_seconds numeric,
  notes text,
  created_at timestamp with time zone default timezone('utc', now())
);

-- POST SESSION CHECK-INS TABLE
-- Stores post-session questionnaire answers
create table public.post_session_checkins (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references public.sessions(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  skin_feel_after text,
  skin_feel_before text,
  user_feedback text,
  barrier_modifier numeric default 0,
  low_calibration_confidence boolean default false,
  flare_up boolean default false,
  created_at timestamp with time zone default timezone('utc', now())
);

-- SKIN AGE SNAPSHOTS TABLE
-- Stores daily skin age calculations for trend line
create table public.skin_age_snapshots (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  skin_age numeric not null,
  calculated_at timestamp with time zone default timezone('utc', now())
);

-- WHAT IF SCENARIOS TABLE
-- Stores saved What If simulator scenarios
create table public.what_if_scenarios (
  id uuid default uuid_generate_v4() primary key,
  session_id uuid references public.sessions(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  spf_override integer,
  water_resistance_override integer,
  application_delay_mins integer,
  reapplication_at_min integer,
  activity_level_override text,
  result_duration_mins numeric,
  created_at timestamp with time zone default timezone('utc', now())
);

-- ROW LEVEL SECURITY
-- Every table is locked down so users can only access their own data
alter table public.users enable row level security;
alter table public.sessions enable row level security;
alter table public.session_readings enable row level security;
alter table public.session_events enable row level security;
alter table public.post_session_checkins enable row level security;
alter table public.skin_age_snapshots enable row level security;
alter table public.what_if_scenarios enable row level security;

-- RLS POLICIES
create policy "Users can only access their own profile"
  on public.users for all using (auth.uid() = id);

create policy "Users can only access their own sessions"
  on public.sessions for all using (auth.uid() = user_id);

create policy "Users can only access their own session readings"
  on public.session_readings for all using (
    auth.uid() = (select user_id from public.sessions where id = session_id)
  );

create policy "Users can only access their own session events"
  on public.session_events for all using (
    auth.uid() = (select user_id from public.sessions where id = session_id)
  );

create policy "Users can only access their own checkins"
  on public.post_session_checkins for all using (auth.uid() = user_id);

create policy "Users can only access their own skin age snapshots"
  on public.skin_age_snapshots for all using (auth.uid() = user_id);

create policy "Users can only access their own what if scenarios"
  on public.what_if_scenarios for all using (auth.uid() = user_id);

-- Deliberately no auto-provisioning trigger on auth.users: the
-- public.users row is only ever created once, by the app itself, when
-- onboarding completes (see App/services/SupabaseService.js
-- completeOnboarding). An account that signs up but never finishes
-- onboarding never gets a profile row at all.

-- AVATAR STORAGE
-- Public bucket so avatar URLs work directly in <Image> with no signed-URL
-- refresh logic — profile pictures aren't sensitive data. Writes are still
-- locked to each user's own folder via RLS.
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing;

create policy "Avatar images are publicly accessible"
  on storage.objects for select using (bucket_id = 'avatars');

create policy "Users can upload their own avatar"
  on storage.objects for insert with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can update their own avatar"
  on storage.objects for update using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users can delete their own avatar"
  on storage.objects for delete using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
