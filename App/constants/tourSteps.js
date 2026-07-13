// Content for the guided app tour. Tier 1 ("welcome") runs once, right
// after the first launch, and actually walks the user across the tabs so
// they see each page, noting which ones fill in only after they log
// sessions. Tier 2 ("milestone") tours are short single-step call-outs
// that fire later, the first time a screen has something real to show.
//
// Each step:
//   tab:    which tab to switch to before the step (defaults to home)
//   target: a key a screen registers via useTourTarget; null means no
//           spotlight (a plain card over a lightly dimmed page)
export const WELCOME_TOUR_ID = 'welcome';

export const WELCOME_TOUR_STEPS = [
  {
    tab: 'home',
    target: null,
    text: 'Welcome to Sureva. Here is a quick tour so you know your way around.',
  },
  {
    tab: 'home',
    target: 'profileButton',
    text: 'Tap your photo or name up top to open Settings, where you manage your account and preferences.',
  },
  {
    tab: 'home',
    target: 'startSession',
    text: 'Tap Start Session before you head outside. Sureva starts tracking your sun exposure and sends you live alerts from your device.',
  },
  {
    tab: 'home',
    target: 'trendsLink',
    text: 'This Week sums up your active days, highest exposure, and weekly UV budget at a glance. Tap "View Exposure Trends" any time for the full picture.',
  },
  {
    tab: 'home',
    target: 'device',
    text: 'This is your paired device. Keep it close during a session so it can measure UV and remind you when to reapply.',
  },
  {
    tab: 'forecast',
    target: null,
    text: 'The Forecast tab shows the UV outlook for your day, so you can plan the best times to cover up.',
  },
  {
    tab: 'history',
    target: null,
    text: 'Your History fills up with every session you log. Once you finish your first one, it shows up right here.',
  },
  {
    tab: 'insights',
    target: null,
    text: 'Insights unlock as you log more sessions. After a few, you will find your trends and Skin Age waiting here.',
  },
  {
    tab: 'home',
    target: 'profileBar',
    text: 'Swipe down from the top of any screen to search and jump straight where you want to go.',
  },
  {
    tab: 'home',
    target: null,
    text: 'That is it. Log your first session and Sureva will start learning your skin.',
  },
];

// Tier 2: one-step coach marks, each its own tiny "tour" with a single
// entry, gated by its own flag and a real condition checked where it is
// used. These fire while the user is already on the relevant screen, so
// they carry no tab of their own.
export const MILESTONE_TOURS = {
  historyFirstSession: {
    id: 'historyFirstSession',
    steps: [{
      target: 'firstSessionCard',
      text: 'That is your first session logged. Every session you add builds your History and unlocks deeper Insights.',
    }],
  },
  passportFirstPin: {
    id: 'passportFirstPin',
    steps: [{
      target: 'passportMap',
      text: 'This is your Passport. Every place you protect your skin gets pinned right here.',
    }],
  },
  skinAgeUnlocked: {
    id: 'skinAgeUnlocked',
    steps: [{
      target: 'revealButton',
      text: 'You have logged enough sessions to calculate your Skin Age. Tap here to reveal it.',
    }],
  },
};
