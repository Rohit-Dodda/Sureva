// Named signature glyphs for the recap deck, resolved to SVG path `d` strings
// on a shared 0..100 viewBox. Cards carry a `morphIcon` name; the transition
// layer morphs one card's glyph into the next (via morph.js), and the bridge
// cards draw the upcoming glyph as a run-up.
//
// Every entry is a single CLOSED path (M / L / C / Q / Z only — no arcs,
// which flubber samples poorly) centered on (50,50) with roughly matched
// area, so morphs read as a smooth reshape rather than a pop.
export const GLYPH_VIEWBOX = 100;

export const GLYPHS = {
  // Sun / clean disc — the recurring hero mark that opens and closes the deck.
  sun: 'M84,50 C84,68.78 68.78,84 50,84 C31.22,84 16,68.78 16,50 C16,31.22 31.22,16 50,16 C68.78,16 84,31.22 84,50 Z',
  ring: 'M82,50 C82,67.67 67.67,82 50,82 C32.33,82 18,67.67 18,50 C18,32.33 32.33,18 50,18 C67.67,18 82,32.33 82,50 Z',
  drop: 'M50,14 C64,40 80,54 66,72 C58,82 42,82 34,72 C20,54 36,40 50,14 Z',
  flame: 'M50,12 C58,34 78,42 70,64 C65,80 35,80 30,64 C26,50 40,48 44,32 C48,44 46,54 54,56 C62,52 54,32 50,12 Z',
  shield: 'M50,14 L82,26 C82,58 68,78 50,86 C32,78 18,58 18,26 Z',
  pin: 'M50,14 C66,14 78,26 78,42 C78,60 50,86 50,86 C50,86 22,60 22,42 C22,26 34,14 50,14 Z',
  star: 'M50,12 L61,38 L88,40 L67,58 L74,86 L50,70 L26,86 L33,58 L12,40 L39,38 Z',
  check: 'M30,50 L44,66 L74,28 L82,36 L44,82 L22,58 Z',
  chart: 'M18,82 L18,56 L34,56 L34,82 L42,82 L42,40 L58,40 L58,82 L66,82 L66,24 L82,24 L82,82 Z',
  mountain: 'M12,82 L40,34 L54,58 L66,40 L88,82 Z',
};

export function glyphPath(name) {
  return GLYPHS[name] ?? null;
}
