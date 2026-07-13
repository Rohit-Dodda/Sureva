// Everything Quick Search can find and jump to: the top-level pages plus
// every card header across the app. `tab` is the root tab a destination
// lives under; `opener` (when present) is the registry key a nested screen
// registers via useRegisterOpener so selecting it pushes that screen open.
// `isPage` entries are the plain page destinations shown as suggestions
// before the user types anything; the rest surface only while searching.
//
// Result rows show `title` (the card or page name) over `page` (where it
// lives), so a match reads as "Sunscreen Performance" on "Insights".

const PAGES = [
  { id: 'home', title: 'Home', page: 'Page', icon: 'home-outline', tab: 'home', isPage: true, keywords: ['dashboard', 'today'] },
  { id: 'forecast', title: 'Forecast', page: 'Page', icon: 'partly-sunny-outline', tab: 'forecast', isPage: true, keywords: ['uv', 'weather', 'sun'] },
  { id: 'history', title: 'History', page: 'Page', icon: 'time-outline', tab: 'history', isPage: true, keywords: ['sessions', 'past', 'log'] },
  { id: 'insights', title: 'Insights', page: 'Page', icon: 'bar-chart-outline', tab: 'insights', isPage: true, keywords: ['stats', 'analytics'] },
  { id: 'settings', title: 'Settings', page: 'Page', icon: 'settings-outline', tab: 'home', opener: 'settings', isPage: true, keywords: ['profile', 'account', 'preferences'] },
  { id: 'trends', title: 'Weekly Trends', page: 'Page', icon: 'trending-up-outline', tab: 'home', opener: 'trends', isPage: true, keywords: ['exposure', 'weekly'] },
  { id: 'passport', title: 'Passport', page: 'Page', icon: 'map-outline', tab: 'history', opener: 'passport', isPage: true, keywords: ['map', 'locations', 'places'] },
  { id: 'skinAge', title: 'Skin Age', page: 'Page', icon: 'body-outline', tab: 'insights', opener: 'skinAge', isPage: true, keywords: ['reveal', 'age'] },
];

const CARDS = [
  // Home
  { title: "Today's Protection", page: 'Home', icon: 'shield-checkmark-outline', tab: 'home' },
  { title: 'Last Session', page: 'Home', icon: 'time-outline', tab: 'home' },
  { title: 'This Week', page: 'Home', icon: 'bar-chart-outline', tab: 'home' },
  { title: 'Your Protection Pattern', page: 'Home', icon: 'analytics-outline', tab: 'home' },
  { title: 'My Device', page: 'Home', icon: 'bluetooth-outline', tab: 'home' },

  // Forecast
  { title: "Today's UV Forecast", page: 'Forecast', icon: 'sunny-outline', tab: 'forecast' },
  { title: 'Recommended Setup', page: 'Forecast', icon: 'shield-checkmark-outline', tab: 'forecast' },
  { title: 'This Week', page: 'Forecast', icon: 'calendar-outline', tab: 'forecast' },

  // Insights
  { title: 'Your Skin Profile', page: 'Insights', icon: 'finger-print-outline', tab: 'insights' },
  { title: 'Your Patterns', page: 'Insights', icon: 'analytics-outline', tab: 'insights' },
  { title: 'Your Protection History', page: 'Insights', icon: 'albums-outline', tab: 'insights' },
  { title: 'Seasonal Intelligence', page: 'Insights', icon: 'partly-sunny-outline', tab: 'insights' },
  { title: 'Sunscreen Performance', page: 'Insights', icon: 'flask-outline', tab: 'insights' },
  { title: 'Body Intelligence', page: 'Insights', icon: 'body-outline', tab: 'insights' },
  { title: 'Compliance Intelligence', page: 'Insights', icon: 'checkmark-done-outline', tab: 'insights' },
  { title: 'Risk Intelligence', page: 'Insights', icon: 'telescope-outline', tab: 'insights' },

  // Weekly Trends
  { title: "Sureva's Read", page: 'Weekly Trends', icon: 'sparkles-outline', tab: 'home', opener: 'trends' },

  // Session Detail (opens the most recent session)
  { title: 'Protection Timeline', page: 'Session Detail', icon: 'pulse-outline', tab: 'home', opener: 'lastSession' },
  { title: 'Session Moments', page: 'Session Detail', icon: 'time-outline', tab: 'home', opener: 'lastSession' },
  { title: 'What Drove Your Depletion', page: 'Session Detail', icon: 'flame-outline', tab: 'home', opener: 'lastSession' },
  { title: 'Alert Compliance', page: 'Session Detail', icon: 'notifications-outline', tab: 'home', opener: 'lastSession' },
  { title: 'Your Pattern', page: 'Session Detail', icon: 'analytics-outline', tab: 'home', opener: 'lastSession' },
  { title: 'Your Skin Today', page: 'Session Detail', icon: 'body-outline', tab: 'home', opener: 'lastSession' },
  { title: 'What Sureva Prevented', page: 'Session Detail', icon: 'shield-outline', tab: 'home', opener: 'lastSession' },
];

// Stable ids for card entries (page + title, slugified) so React keys and
// selection stay consistent.
const CARD_ENTRIES = CARDS.map((c) => ({
  ...c,
  id: `${c.page}:${c.title}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
}));

export const SEARCH_PAGES = PAGES;
const SEARCH_INDEX = [...PAGES, ...CARD_ENTRIES];
export default SEARCH_INDEX;
