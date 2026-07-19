// Shared source of truth for onboarding answer choices — used by
// OnboardingScreen (first-time setup) and EditSkinProfileScreen (editing
// those same answers later from Settings), so the two never drift.
export const SKIN_TONES = [
  { id: 1, color: '#F3CBA4' },
  { id: 2, color: '#D4956A' },
  { id: 3, color: '#BF7A40' },
  { id: 4, color: '#8B5530' },
  { id: 5, color: '#7A3E1A' },
  { id: 6, color: '#2C0D05' },
];

export const AGE_RANGES = [
  { id: 0, label: 'Under 12' },
  { id: 1, label: '12–50' },
  { id: 2, label: '51–64' },
  { id: 3, label: '65+' },
];

export const BURN_OPTIONS = [
  { id: 'very_fast', label: 'Very quickly',   sub: 'I burn within 15 minutes'   },
  { id: 'fast',      label: 'Fairly quickly', sub: 'I burn within 30 minutes'   },
  { id: 'moderate',  label: 'Moderately',     sub: 'I burn after about an hour' },
  { id: 'rarely',    label: 'Rarely',          sub: 'I barely burn at all'       },
  { id: 'unsure',    label: "I'm not sure",    sub: null                         },
];

export const SKIN_TYPES = [
  { id: 'normal', label: 'Normal' },
  { id: 'oily',   label: 'Oily'   },
  { id: 'dry',    label: 'Dry'    },
];

// "Other" is handled specially in OnboardingScreen's ReferralStep — picking
// it reveals a free-text box instead of just being another button.
export const REFERRAL_OTHER_ID = 'other';

export const REFERRAL_SOURCES = [
  { id: 'instagram',    label: 'Instagram' },
  { id: 'tiktok',       label: 'TikTok' },
  { id: 'facebook',     label: 'Facebook' },
  { id: 'twitter',      label: 'Twitter / X' },
  { id: 'youtube',      label: 'YouTube' },
  { id: 'reddit',       label: 'Reddit' },
  { id: 'google',       label: 'Google Search' },
  { id: 'app_store',    label: 'App Store' },
  { id: 'friend',       label: 'Friend or Family' },
  { id: 'podcast',      label: 'Podcast or Radio' },
  { id: REFERRAL_OTHER_ID, label: 'Other' },
];

export const CONDITIONS_INFO = {
  medications: {
    title: 'Photosensitizing Medications',
    body: 'These medications increase your skin\'s sensitivity to UV light, meaning you can burn faster and more severely than usual. Sureva uses this to shorten your reapplication intervals and alert you sooner.',
  },
  skinCondition: {
    title: 'Skin Conditions',
    body: 'Conditions like rosacea, eczema, psoriasis, and lupus make skin more reactive to UV damage. We use this to recommend more protective reapplication intervals and gentler exposure limits.',
  },
};
