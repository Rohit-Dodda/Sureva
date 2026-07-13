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
  try {
    const { firstName, lastName } = deriveName(user);
    const { error } = await supabase.from('users').insert({
      id: user.id,
      email: user.email,
      first_name: firstName,
      last_name: lastName,
      age_range: onboardingAnswers.ageRange,
      skin_tone: onboardingAnswers.skinTone,
      skin_type: onboardingAnswers.skinType,
      burn_rate: onboardingAnswers.burnRate,
      medications: onboardingAnswers.medications,
      skin_condition: onboardingAnswers.skinCondition,
      onboarding_complete: true,
    });
    if (error) throw error;
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

    const result = await WebBrowser.openAuthSessionAsync(data.url, EMAIL_REDIRECT_TO);
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

async function updateUserProfile(uid, fields) {
  try {
    const { error } = await supabase.from('users').update(fields).eq('id', uid);
    if (error) throw error;
    return { data: true, error: null };
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
  checkEmailExists,
  getUserProfile,
  updateUserProfile,
  uploadAvatar,
  removeAvatar,
  createSession,
  getSessions,
  getSessionById,
  updateSession,
  insertSessionReading,
  insertSessionEvent,
  savePostSessionCheckIn,
  saveSkinAgeSnapshot,
  getSkinAgeSnapshots,
  saveWhatIfScenario,
};
