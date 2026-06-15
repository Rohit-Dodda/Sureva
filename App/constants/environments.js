// Session environment categories + the keyword heuristic that maps a
// reverse-geocoded place onto one of them.
export const ENVIRONMENTS = [
  { label: 'Beach',           icon: 'umbrella-outline' },
  { label: 'Mountain',        icon: 'triangle-outline' },
  { label: 'Snow',            icon: 'snow-outline' },
  { label: 'Park / Trail',    icon: 'leaf-outline' },
  { label: 'Desert',          icon: 'sunny-outline' },
  { label: 'Water / Boating', icon: 'boat-outline' },
  { label: 'Urban',           icon: 'business-outline' },
  { label: 'Other',           icon: 'location-outline' },
];

export const CUSTOM_ENVIRONMENT = { label: 'Custom', icon: 'create-outline' };

// Checked in order — Snow first so ski resorts don't fall into Mountain
// (snow reflects ~80% of UV vs ~15% for sand), Desert last since "valley"
// is the loosest keyword.
const KEYWORD_RULES = [
  { label: 'Snow',            words: ['ski', 'glacier', 'resort'] },
  { label: 'Beach',           words: ['beach', 'coast', 'shore', 'bay', 'seaside', 'pier', 'boardwalk'] },
  { label: 'Mountain',        words: ['mountain', 'peak', 'summit', 'ridge', 'national forest', 'wilderness'] },
  { label: 'Park / Trail',    words: ['park', 'garden', 'reserve', 'trail', 'preserve'] },
  { label: 'Water / Boating', words: ['lake', 'marina', 'harbor', 'harbour', 'river'] },
  // "valley" deliberately excluded — it appears in countless non-arid place
  // names (e.g. "Tahoe Valley") and aridity can't be checked from a geocode
  { label: 'Desert',          words: ['desert', 'dunes'] },
];

export function classifyPlace(place) {
  if (!place) return 'Other';
  // A street number means an addressable building (someone's house, an
  // office). Street names ("Lakeview Dr"), neighborhoods ("Lakeside"),
  // counties ("Lake County"), and cities/regions ("Lake Forest", "Bay
  // Area") all false-positive nature categories, so an address classifies
  // straight to Urban/Other with no keyword matching at all.
  const atAddress = Boolean(place.streetNumber);
  const fields = atAddress
    ? []
    : [place.name, place.street, place.district, place.subregion];
  const text = fields.filter(Boolean).join(' ').toLowerCase();
  // city/district indicate a populated place; subregion/region alone
  // (a county or state with nothing else) could be open wilderness
  const isPopulated = Boolean(place.city || place.district || place.streetNumber);
  if (text.trim()) {
    // Whole-word match so "Bayshore" doesn't hit "bay", "Parker" doesn't hit "park"
    for (const rule of KEYWORD_RULES) {
      if (rule.words.some((w) => new RegExp(`\\b${w}\\b`).test(text))) return rule.label;
    }
  }
  // No nature/water signal — populated area defaults to Urban
  if (isPopulated) return 'Urban';
  return 'Other';
}
