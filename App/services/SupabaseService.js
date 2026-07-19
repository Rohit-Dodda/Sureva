import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from './supabase';

// ── Auth ────────────────────────────────────────────────────────────

// Deep-link target for the emailed confirmation link and the OAuth
// redirect — matches app.json's "scheme": "sureva". AuthContext's Linking
// listener catches this and exchanges the `code` param for a session.
const EMAIL_REDIRECT_TO = 'sureva://auth-callback';

// Step 1 of signup: create the auth account only. No row is written to
// public.users yet — that only happens once onboarding completes (see
// completeOnboarding below), so an account that's abandoned mid-onboarding
// never leaves a half-filled profile behind. first_name/last_name ride
// along as auth metadata so they're available later without needing a
// profile row to already exist.
async function createUser(email, password, firstName, lastName) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName, last_name: lastName },
        emailRedirectTo: EMAIL_REDIRECT_TO,
      },
    });
    if (error) throw error;
    return { data: data.user, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// Re-sends the signup confirmation link to an unconfirmed address.
async function resendSignupEmail(email) {
  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: EMAIL_REDIRECT_TO },
    });
    if (error) throw error;
    return { data: true, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// first_name/last_name only exist as auth metadata (from createUser above)
// for an email/password signup. A Google signin never goes through
// createUser, so it never sets that metadata — this pulls whatever Google
// provided instead, falling back to splitting a full name if that's all
// there is, so the profile row always gets a best-effort name either way.
function deriveName(user) {
  const meta = user.user_metadata ?? {};
  if (meta.first_name || meta.last_name) {
    return { firstName: meta.first_name ?? '', lastName: meta.last_name ?? '' };
  }
  if (meta.given_name || meta.family_name) {
    return { firstName: meta.given_name ?? '', lastName: meta.family_name ?? '' };
  }
  const fullName = meta.full_name ?? meta.name ?? '';
  const [firstName, ...rest] = fullName.trim().split(/\s+/).filter(Boolean);
  return { firstName: firstName ?? '', lastName: rest.join(' ') };
}

// Step 2 of signup: creates the public.users row for the first time, in
// one shot, once onboarding answers are collected. There is no row to
// update before this — the account exists only in auth.users until now.
// Runs with a real session already in place (post email-confirmation or
// Google sign-in), so this insert satisfies RLS on its own; no
// security-definer trigger workaround needed.
async function completeOnboarding(user, onboardingAnswers) {
  // Core profile fields — these columns have existed since the original
  // schema and always exist. Kept separate from the referral fields below
  // so a missing optional migration can never block the fields that
  // actually drive the depletion algorithm and the Edit Skin Profile screen.
  const coreFields = {
    id: user.id,
    email: user.email,
    age_range: onboardingAnswers.ageRange,
    exact_age: onboardingAnswers.exactAge,
    skin_tone: onboardingAnswers.skinTone,
    skin_type: onboardingAnswers.skinType,
    burn_rate: onboardingAnswers.burnRate,
    medications: onboardingAnswers.medications,
    skin_condition: onboardingAnswers.skinCondition,
    onboarding_complete: true,
  };
  try {
    const { firstName, lastName } = deriveName(user);
    // Upsert, not insert: lets onboarding be safely re-run for the same
    // account (e.g. re-testing the flow) without failing on the existing
    // row's primary key — a normal first-time completion behaves identically
    // to before since there's nothing to conflict with yet.
    const { error } = await supabase.from('users').upsert({
      ...coreFields,
      first_name: firstName,
      last_name: lastName,
      referral_source: onboardingAnswers.referralSource,
      referral_source_other: onboardingAnswers.referralSourceOther,
    });
    if (error) {
      // referral_source/referral_source_other need migration
      // 20260718000000_add_referral_source.sql applied to the live database
      // — if it hasn't been, Postgres rejects the WHOLE upsert with
      // "column does not exist", silently failing to save anything at all,
      // core fields included. Retry without them so the fields that
      // actually matter (skin tone, age, skin type, burn rate) still save.
      console.log('completeOnboarding: full upsert failed, retrying without referral fields:', error.message);
      const { error: coreError } = await supabase
        .from('users')
        .upsert({ ...coreFields, first_name: firstName, last_name: lastName });
      if (coreError) throw coreError;
    }
    return { data: true, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

async function signIn(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return { data: data.user, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// Sends a password-reset link to the given address. Tapping it produces a
// session via the same deep-link + exchangeCodeForSession path as every
// other email flow, but AuthContext's listener sees a distinct
// PASSWORD_RECOVERY event for it — that's what routes the app to
// ResetPasswordScreen instead of signing the user straight in.
async function resetPasswordForEmail(email) {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: EMAIL_REDIRECT_TO,
    });
    if (error) throw error;
    return { data: true, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// Sets a new password on the session created by the recovery link above.
async function updatePassword(newPassword) {
  try {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    return { data: true, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// Starts an email change. This does NOT change the address immediately —
// Supabase sends a confirmation link to the new address (and, with
// "Secure email change" on, the old one too) and the auth.users row only
// updates once it's tapped. That link is the same `sureva://auth-callback`
// deep link every other email flow uses, so AuthContext's existing
// exchangeCodeForSession handling picks it up automatically — no separate
// wiring needed for the confirmation itself.
async function updateEmail(newEmail) {
  try {
    const { error } = await supabase.auth.updateUser(
      { email: newEmail },
      { emailRedirectTo: EMAIL_REDIRECT_TO }
    );
    if (error) throw error;
    return { data: true, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// Opens Google's OAuth consent screen in an in-app browser session, then
// exchanges the resulting code for a session. Works for both sign-up and
// sign-in — Google covers both, there is no separate "create" step.
// AuthContext's onAuthStateChange listener picks up the new session the
// same way it does for the email flow; the caller doesn't need to do
// anything further on success.
async function signInWithGoogle() {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: EMAIL_REDIRECT_TO, skipBrowserRedirect: true },
    });
    if (error) throw error;

    // preferEphemeralSession: without it, iOS shares cookies with the
    // user's normal browser session, so Google sees an existing session and
    // silently signs back in as whoever was last used — never showing the
    // account picker, even after signing out of the app itself (that only
    // clears Supabase's session, not Google's own browser cookies).
    const result = await WebBrowser.openAuthSessionAsync(data.url, EMAIL_REDIRECT_TO, {
      preferEphemeralSession: true,
    });
    if (result.type !== 'success') {
      // User cancelled or dismissed the sheet — not an error to surface.
      return { data: null, error: null };
    }

    const { queryParams } = Linking.parse(result.url);
    if (!queryParams?.code) throw new Error('No authorization code returned');

    const { data: sessionData, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(queryParams.code);
    if (exchangeError) throw exchangeError;
    return { data: sessionData.user, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { data: true, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

async function checkEmailExists(email) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    if (error) throw error;
    return { data: !!data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// ── User profile ────────────────────────────────────────────────────

async function getUserProfile(uid) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', uid)
      .single();
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// Best-effort, non-blocking — see updatePersonalFactor in
// depletionEngine.js. Called after a session has already finished saving,
// so a failure here (most likely: the personal_factor column migration
// hasn't been applied yet) must never surface as a session-save error.
async function savePersonalFactor(uid, value) {
  try {
    const { error } = await supabase.from('users').update({ personal_factor: value }).eq('id', uid);
    if (error) throw error;
    return { data: true, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

async function updateUserProfile(uid, fields) {
  try {
    const { error } = await supabase.from('users').update(fields).eq('id', uid);
    if (error) throw error;
    return { data: true, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// Permanently deletes the signed-in user's entire account — the auth
// credential itself, not just their app data. Done via a server-side
// Edge Function (supabase/functions/delete-account) since only the
// Admin API can remove an auth.users row, and that needs a
// service-role key that must never ship in the client. Deleting
// auth.users cascades (via schema.sql's `on delete cascade`) to remove
// public.users and every dependent row automatically — nothing else
// to clean up client-side.
async function deleteAccountData() {
  try {
    const { data, error } = await supabase.functions.invoke('delete-account');
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return { data: true, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// Gathers every row this account owns into one portable, JSON-able object —
// the "export your data" / "access your information" right described in the
// Privacy Policy (Section 8). Sessions are fetched with their nested
// readings/events/check-ins in one relational query, mirroring
// getSessionById's join shape, rather than N separate round trips.
async function exportAccountData(uid) {
  try {
    if (!uid) throw new Error('Not signed in');

    const [profileRes, sessionsRes, skinAgeRes, whatIfRes] = await Promise.all([
      supabase.from('users').select('*').eq('id', uid).single(),
      supabase
        .from('sessions')
        .select('*, session_events(*), session_readings(*), post_session_checkins(*)')
        .eq('user_id', uid)
        .order('start_time', { ascending: false }),
      supabase.from('skin_age_snapshots').select('*').eq('user_id', uid).order('calculated_at', { ascending: true }),
      supabase.from('what_if_scenarios').select('*').eq('user_id', uid),
    ]);

    if (profileRes.error) throw profileRes.error;
    if (sessionsRes.error) throw sessionsRes.error;
    if (skinAgeRes.error) throw skinAgeRes.error;
    if (whatIfRes.error) throw whatIfRes.error;

    return {
      data: {
        exportedAt: new Date().toISOString(),
        profile: profileRes.data,
        sessions: sessionsRes.data,
        skinAgeSnapshots: skinAgeRes.data,
        whatIfScenarios: whatIfRes.data,
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error };
  }
}

// ── Avatar ───────────────────────────────────────────────────────────

// Always stored as a single overwritten jpeg per user, so there's exactly
// one deterministic path to upload/remove — no need to list the folder
// first to find the previous file's extension.
function avatarPath(uid) {
  return `${uid}/avatar.jpg`;
}

// Uploads a locally-picked image (from expo-image-picker) to the public
// avatars bucket and stamps the resulting URL onto public.users. The
// query-string timestamp busts <Image> caching on re-upload, since the
// storage path itself never changes.
async function uploadAvatar(uid, localUri) {
  try {
    const response = await fetch(localUri);
    const arraybuffer = await response.arrayBuffer();
    const path = avatarPath(uid);

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, arraybuffer, { contentType: 'image/jpeg', upsert: true });
    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(path);
    const avatarUrl = `${publicUrlData.publicUrl}?updated=${Date.now()}`;

    const { error: updateError } = await supabase
      .from('users')
      .update({ avatar_url: avatarUrl })
      .eq('id', uid);
    if (updateError) throw updateError;

    return { data: avatarUrl, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

async function removeAvatar(uid) {
  try {
    const { error: removeError } = await supabase.storage.from('avatars').remove([avatarPath(uid)]);
    if (removeError) throw removeError;

    const { error: updateError } = await supabase
      .from('users')
      .update({ avatar_url: null })
      .eq('id', uid);
    if (updateError) throw updateError;

    return { data: true, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// ── Sessions ─────────────────────────────────────────────────────────

async function createSession(uid, sessionData) {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .insert({ user_id: uid, ...sessionData })
      .select()
      .single();
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

async function getSessions(uid) {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', uid)
      // Excludes the currently in-progress session (end_time not yet set) —
      // every caller of this (Last Session card, Skin Age aggregates,
      // Pattern card history) wants completed sessions only.
      .not('end_time', 'is', null)
      .order('start_time', { ascending: false });
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

async function getSessionById(sessionId) {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .select(`
        *,
        session_events(*),
        session_readings(*),
        post_session_checkins(*)
      `)
      .eq('id', sessionId)
      .single();
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

async function updateSession(sessionId, fields) {
  try {
    const { error } = await supabase.from('sessions').update(fields).eq('id', sessionId);
    if (error) throw error;
    return { data: true, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

async function insertSessionReading(sessionId, reading) {
  try {
    const { error } = await supabase
      .from('session_readings')
      .insert({ session_id: sessionId, ...reading });
    if (error) throw error;
    return { data: true, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// Batch variant — used at session end to write every 30-second reading in
// one call instead of one insert per tick.
async function insertSessionReadings(sessionId, readings) {
  try {
    if (!readings.length) return { data: true, error: null };
    const { error } = await supabase
      .from('session_readings')
      .insert(readings.map((r) => ({ session_id: sessionId, ...r })));
    if (error) throw error;
    return { data: true, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

async function insertSessionEvent(sessionId, event) {
  try {
    const { error } = await supabase
      .from('session_events')
      .insert({ session_id: sessionId, ...event });
    if (error) throw error;
    return { data: true, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// Batch variant — used at session end to write every reapplication/alert
// event in one call instead of one insert per event.
async function insertSessionEvents(sessionId, events) {
  try {
    if (!events.length) return { data: true, error: null };
    const { error } = await supabase
      .from('session_events')
      .insert(events.map((e) => ({ session_id: sessionId, ...e })));
    if (error) throw error;
    return { data: true, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// ── Post-session check-in ───────────────────────────────────────────

async function savePostSessionCheckIn(uid, sessionId, record) {
  try {
    if (!uid) throw new Error('Not signed in');
    const { error } = await supabase.from('post_session_checkins').insert({
      session_id: sessionId,
      user_id: uid,
      skin_feel_after: record.postSession?.skinFeelAfter ?? null,
      skin_feel_before: record.postSession?.skinFeelBefore ?? null,
      user_feedback: record.postSession?.userFeedback ?? null,
      low_calibration_confidence: record.sessionCorrections?.lowCalibrationConfidence ?? false,
      flare_up: record.sessionCorrections?.flareUp ?? false,
    });
    if (error) throw error;
    return { data: true, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// Most recent post-session check-in's Q1 answer (skin_feel_after), from
// any session before the one currently being checked in on. Powers
// CheckInSheet's "went out while recovering from irritation" pattern check.
async function getLastCompletedCheckIn(uid, excludeSessionId) {
  try {
    if (!uid) throw new Error('Not signed in');
    let query = supabase
      .from('post_session_checkins')
      .select('skin_feel_after, created_at')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(1);
    if (excludeSessionId) query = query.neq('session_id', excludeSessionId);
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return { data: data?.skin_feel_after ?? null, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// Passport map pin summaries — coords, score, UV and the other lightweight
// fields the map/rankings need. Deliberately never selects session_readings.
async function getSessionPinSummaries(uid) {
  try {
    const { data, error } = await supabase
      .from('sessions')
      .select(`
        id, start_time, end_time, duration_minutes, spf, activity_level,
        environment, peak_uv, average_uv, average_humidity, peak_temperature,
        average_depletion_rate, protection_score, alert_response_time_avg,
        alert_count, water_events, unprotected_minutes, latitude, longitude,
        location_name, city, region,
        post_session_checkins(skin_feel_after, skin_feel_before)
      `)
      .eq('user_id', uid)
      .not('latitude', 'is', null)
      .not('end_time', 'is', null)
      .order('start_time', { ascending: false });
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// ── Skin age ─────────────────────────────────────────────────────────

// Stores one skin-age snapshot. The Skin Age trend chart reads this history.
async function saveSkinAgeSnapshot(uid, skinAge) {
  try {
    if (!uid) throw new Error('Not signed in');
    const { error } = await supabase
      .from('skin_age_snapshots')
      .insert({ user_id: uid, skin_age: skinAge });
    if (error) throw error;
    return { data: true, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

async function getSkinAgeSnapshots(uid) {
  try {
    const { data, error } = await supabase
      .from('skin_age_snapshots')
      .select('*')
      .eq('user_id', uid)
      .order('calculated_at', { ascending: true });
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

// ── What If scenarios ────────────────────────────────────────────────

async function saveWhatIfScenario(uid, sessionId, scenario) {
  try {
    if (!uid) throw new Error('Not signed in');
    const { error } = await supabase.from('what_if_scenarios').insert({
      session_id: sessionId,
      user_id: uid,
      spf_override: scenario.overrides?.spf ?? null,
      water_resistance_override: scenario.overrides?.waterResistanceRating ?? null,
      application_delay_mins: scenario.overrides?.applicationDelayMinutes ?? null,
      reapplication_at_min: scenario.overrides?.reapplicationMinutes?.[0] ?? null,
      activity_level_override: scenario.overrides?.activityLevel ?? null,
      result_duration_mins: scenario.deltaProtectedMinutes ?? null,
    });
    if (error) throw error;
    return { data: true, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

export default {
  createUser,
  resendSignupEmail,
  completeOnboarding,
  signIn,
  signInWithGoogle,
  signOut,
  resetPasswordForEmail,
  updatePassword,
  updateEmail,
  checkEmailExists,
  getUserProfile,
  updateUserProfile,
  savePersonalFactor,
  deleteAccountData,
  exportAccountData,
  uploadAvatar,
  removeAvatar,
  createSession,
  getSessions,
  getSessionById,
  updateSession,
  insertSessionReading,
  insertSessionReadings,
  insertSessionEvent,
  insertSessionEvents,
  getLastCompletedCheckIn,
  getSessionPinSummaries,
  savePostSessionCheckIn,
  saveSkinAgeSnapshot,
  getSkinAgeSnapshots,
  saveWhatIfScenario,
};
