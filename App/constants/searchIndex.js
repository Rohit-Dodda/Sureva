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
  { id: 'home', title: 'Home', page: 'Page', icon: 'home-outline', tab: 'home', isPage: true, keywords: ['dashboard', 'today', 'overview', 'main'] },
  { id: 'forecast', title: 'Forecast', page: 'Page', icon: 'partly-sunny-outline', tab: 'forecast', isPage: true, keywords: ['uv', 'weather', 'sun', 'sunny', 'outlook'] },
  { id: 'history', title: 'History', page: 'Page', icon: 'time-outline', tab: 'history', isPage: true, keywords: ['sessions', 'past', 'log', 'timeline', 'archive'] },
  { id: 'insights', title: 'Insights', page: 'Page', icon: 'bar-chart-outline', tab: 'insights', isPage: true, keywords: ['stats', 'analytics', 'trends', 'data'] },
  { id: 'settings', title: 'Settings', page: 'Page', icon: 'settings-outline', tab: 'home', opener: 'settings', isPage: true, keywords: ['profile', 'account', 'preferences', 'options', 'config'] },
  { id: 'trends', title: 'Weekly Trends', page: 'Page', icon: 'trending-up-outline', tab: 'home', opener: 'trends', isPage: true, keywords: ['exposure', 'weekly', 'graph', 'chart'] },
  { id: 'passport', title: 'Passport', page: 'Page', icon: 'map-outline', tab: 'history', opener: 'passport', isPage: true, keywords: ['map', 'locations', 'places', 'travel', 'spots'] },
  { id: 'skinAge', title: 'Skin Age', page: 'Page', icon: 'body-outline', tab: 'insights', opener: 'skinAge', isPage: true, keywords: ['reveal', 'age', 'photoaging', 'wrinkles', 'aging'] },
];

const CARDS = [
  // Home
  { title: "Today's Protection", page: 'Home', icon: 'shield-checkmark-outline', tab: 'home', keywords: ['sunscreen', 'spf', 'protected', 'status', 'coverage'] },
  { title: 'Last Session', page: 'Home', icon: 'time-outline', tab: 'home', keywords: ['recent', 'previous', 'most recent'] },
  { title: 'This Week', page: 'Home', icon: 'bar-chart-outline', tab: 'home', keywords: ['weekly', 'week'] },
  { title: 'Your Protection Pattern', page: 'Home', icon: 'analytics-outline', tab: 'home', keywords: ['habits', 'pattern', 'behavior'] },
  { title: 'My Device', page: 'Home', icon: 'bluetooth-outline', tab: 'home', keywords: ['bluetooth', 'wearable', 'sensor', 'battery', 'pairing'] },

  // Forecast
  { title: "Today's UV Forecast", page: 'Forecast', icon: 'sunny-outline', tab: 'forecast', keywords: ['uv index', 'sun', 'sunny', 'weather'] },
  { title: 'Recommended Setup', page: 'Forecast', icon: 'shield-checkmark-outline', tab: 'forecast', keywords: ['spf recommendation', 'sunscreen suggestion', 'recommendation'] },
  { title: 'This Week', page: 'Forecast', icon: 'calendar-outline', tab: 'forecast', keywords: ['weekly forecast', 'upcoming'] },

  // Insights
  { title: 'Your Skin Profile', page: 'Insights', icon: 'finger-print-outline', tab: 'insights', keywords: ['skin type', 'fitzpatrick'] },
  { title: 'Your Patterns', page: 'Insights', icon: 'analytics-outline', tab: 'insights', keywords: ['habits', 'behavior'] },
  { title: 'Your Protection History', page: 'Insights', icon: 'albums-outline', tab: 'insights', keywords: ['history', 'past sessions'] },
  { title: 'Seasonal Intelligence', page: 'Insights', icon: 'partly-sunny-outline', tab: 'insights', keywords: ['seasons', 'summer', 'winter', 'monthly'] },
  { title: 'Sunscreen Performance', page: 'Insights', icon: 'flask-outline', tab: 'insights', keywords: ['spf', 'effectiveness', 'sunblock', 'lotion'] },
  { title: 'Body Intelligence', page: 'Insights', icon: 'body-outline', tab: 'insights', keywords: ['sweat', 'body'] },
  { title: 'Compliance Intelligence', page: 'Insights', icon: 'checkmark-done-outline', tab: 'insights', keywords: ['alerts', 'response', 'compliance'] },
  { title: 'Risk Intelligence', page: 'Insights', icon: 'telescope-outline', tab: 'insights', keywords: ['risk', 'danger', 'exposure limit'] },

  // Weekly Trends
  { title: "Sureva's Read", page: 'Weekly Trends', icon: 'sparkles-outline', tab: 'home', opener: 'trends', keywords: ['ai', 'summary', 'insight'] },

  // Session Detail (opens the most recent session)
  { title: 'Protection Timeline', page: 'Session Detail', icon: 'pulse-outline', tab: 'home', opener: 'lastSession', keywords: ['timeline', 'graph'] },
  { title: 'Session Moments', page: 'Session Detail', icon: 'time-outline', tab: 'home', opener: 'lastSession', keywords: ['highlights', 'events'] },
  { title: 'What Drove Your Depletion', page: 'Session Detail', icon: 'flame-outline', tab: 'home', opener: 'lastSession', keywords: ['factors', 'causes'] },
  { title: 'Alert Compliance', page: 'Session Detail', icon: 'notifications-outline', tab: 'home', opener: 'lastSession', keywords: ['alerts', 'notifications'] },
  { title: 'Your Pattern', page: 'Session Detail', icon: 'analytics-outline', tab: 'home', opener: 'lastSession', keywords: ['pattern'] },
  { title: 'Your Skin Today', page: 'Session Detail', icon: 'body-outline', tab: 'home', opener: 'lastSession', keywords: ['skin feel', 'mood'] },
  { title: 'What Sureva Prevented', page: 'Session Detail', icon: 'shield-outline', tab: 'home', opener: 'lastSession', keywords: ['prevented', 'saved', 'avoided'] },
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
