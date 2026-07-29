# Sun Stamps & The Atlas — feature spec

A camera-based collectible feature for Sureva. Point the camera at the sky, catch what the light looks like right now, and build a personal collection driven by real astronomy, real location, and real weather — never by protection data, never by warnings.

## Governing principle — read this before building anything

**Nothing in this feature may frame the sun as a threat.** Sureva exists so people enjoy the sun confidently, not so they manage anxiety about it. That means, without exception:

- No UV numbers, no "time remaining," no protection-status colors, no "danger zone" language anywhere in this feature.
- The camera view is never a warning display. It's a collectible-hunting tool.
- All numeric data shown to the user must be real and verifiable — coordinates, solar angle, date. Never invented, never LLM-generated. Narration text (the "why a stamp is rare" line) is deterministic and template-based, the same way `SunRecapService.js` already writes narration — not an LLM call.
- This isn't a parallel data pipeline. Wherever the app already computes something real (weather, location, latitude band, altitude), reuse it. Don't duplicate.

If a proposed addition to this feature reads as fear, risk, or urgency in any way, it's wrong — flag it rather than build it.

## What it is

**Sun Stamps** are individual captures — a photo-booth moment, not a data screen. **The Atlas** is the collection board they live in, hung off `PassportScreen`, since that's where the app's other "things I'm proud of" already live.

## Part 1 — The capture ritual ("Scout" view)

- Available **anytime**, standalone. No active BLE session, no protection tracking involved. Only needs camera + location permission.
- Real device compass heading (`expo-sensors` `Magnetometer`) and pitch (`DeviceMotion`) determine where in the real sky the phone is actually pointed. This is genuine AR, not a preset picker.
- Real sun position — azimuth + altitude — computed via deterministic solar-position math from lat/long/date/time. Pure math, offline, no API call, same "trust real math" discipline as the depletion engine.
- **The Sun Arc**: today's full sunrise-to-sunset trajectory rendered as a glowing arc across the real sky as the user pans, current position marked, golden-hour stretches visibly warmer along the line.
- **Stamp Constellation**: when revisiting a place, translucent ghost markers show past captures at their true historical sun positions there.
- **Live rarity readout**: as the user pans, the tier they'd currently capture (see Part 2) updates in real time — this is what makes it "scouting" rather than "snapping." The view is deliberately started away from the best spot, so finding it is the point.
- **Capture**: shutter press → flash + button feedback → builds the stamp recipe from real conditions at that exact instant → shows the Reveal (Part 3).
- **Cap**: one capturable stamp per place per day, to stop shutter-spam from trivializing the collection. Note this is mostly a courtesy limit, not a security one — because rarity is computed, not rolled, mashing the shutter on the same real moment just returns the same tier every time. There's no "reroll for luck."

## Part 2 — Rarity logic (the actual algorithm)

Rarity is the **max of four independent, honestly-computed signals** — not a random roll, not additive. Whichever signal is most extreme for a given capture determines both the tier and the "why" text shown to the user.

1. **Seasonal extremity (E)** — how close today's solar-noon altitude is to the user's personal yearly max/min at this latitude. High near a solstice (the sun's most extreme angle of the year, even though it changes slowly day-to-day there).
   `E = |altitude_today − year_midpoint| / (year_range / 2)`

2. **Window narrowness (W)** — the day-to-day rate of change of solar altitude at this latitude/date (`d(altitude)/d(day)`). High near an equinox — this is the genuinely time-narrow signal, since the sun's angle there is only true for a day or two before it's meaningfully different. (Correction from earlier in design: solstices are *extreme*, not *narrow* — don't conflate the two.)

3. **Personal novelty (N)** — is this latitude band / altitude band / place new for this specific user. Discrete, reuses `AchievementService.js`'s existing `latitudeLevel` and `maxAltitudeM` logic and `LocationService.js`'s place resolution directly — no new tracking.

4. **Atmospheric luck (A)** — real cloud-cover data (current from `WeatherService.js`, typical-for-month baseline from Open-Meteo's climate history) flags clear direct sun in a place/season that's usually overcast as a genuinely uncommon event. The one probabilistic signal in the system; the other three are pure geometry/history.

Tier = `map(max(E, W, N, A))` onto four bands, named for *why* they're rare rather than generic RPG tiers:

| Tier | Meaning |
|---|---|
| Everyday | Ordinary conditions, nothing signal-worthy |
| Seasonal | A genuine dawn/dusk/golden-hour timing |
| Alignment | A specific geometric or geographic convergence |
| Once-a-Year | Extreme on at least one signal — verifiable, explainable, rare |

The "why" line is one deterministic sentence naming which signal fired — e.g. *"This angle only recurs in about a 3-day window here"* (W), *"Your first capture above 2,000m"* (N), *"Clear skies in a spot that's cloudy most of July"* (A). Never a vague "rare!" with no reason.

## Part 3 — The Reveal (what happens right after capture)

A full-screen card, shown **every time**, regardless of whether it changes the Atlas — the card itself is the reward, not just progression.

Visual language: vintage astronomical plate crossed with a postage stamp, not a flat gradient chip.

- Sky + glow + faint engraved radiating rays, colored per tier.
- A circular "postmark" — real SVG `textPath` around a ring, reading `SUREVA · CAUGHT · [DATE]`.
- A bottom brass-plate label: place name (serif italic), date + time, and — the real math shown as decoration, not hidden in a backend — coordinates and solar altitude/azimuth in a monospace "scientific label" style (e.g. `34.62°N 76.53°W · ALT 4° · AZ 217°`).
- Escalating frame treatment by tier: plain thin border (Everyday) → gold border + soft glow (Seasonal) → richer amber border + shimmer (Alignment) → dual-tone gold-to-violet gradient border + a wax-seal medallion (Once-a-Year) — meant to read as special from across a room, no caption needed.
- Tier name + the one-line "why" below the card. Tap anywhere to dismiss and commit into the Atlas.

## Part 4 — The Atlas board

Four rows (axes), each a fixed set of category slots:

- **Place** — open-ended, fills with real resolved place names as captured.
- **Latitude** — Equatorial / Tropics / Temperate / Polar (reuses `latitudeLevel`).
- **Altitude** — Sea Level / Foothill / Highland / Summit (reuses `maxAltitudeM`).
- **Season** — Spring Equinox / Summer Solstice / Autumn Equinox / Winter Solstice.

Empty slots render as outlined placeholders **naming exactly what's missing** ("Summit," "Winter Solstice") — the gap has to be specific enough to give someone a reason for their next trip, not just a vague "collect more."

**Design correction from the prototype**: the demo mapped each rarity tier to exactly one row for simplicity (Everyday→Place, Seasonal→Season, etc.). The real logic shouldn't do that — a single capture should be checked against **all four axes independently** and fill/upgrade any slot it qualifies for, regardless of which signal happened to be its dominant one. A great capture deserves to advance more than one row if it genuinely qualifies for more than one.

## Part 5 — Duplicates and revisits

- A slot always keeps the **best** capture for that value, never the first or most recent.
- Recapturing somewhere you already have a stamp still plays the full Reveal (the moment is unconditional) but only updates the Atlas if the new tier beats what's already there.
- A small revisit counter ("×3") on a filled chip shows how many times that spot/category has been caught, without needing new slots for it.
- Everything ever captured — duplicate or not — can live in a separate plain chronological log, distinct from the curated Atlas board, for anyone who wants the full diary rather than just the best-of.
- No cooldown timer needed: since rarity is computed from real conditions, not randomized, capturing the same real moment twice just returns the same tier both times. The only way to upgrade a slot is to genuinely come back on a different day/season/weather.

## Part 6 — Where this gets built (grounded in the current codebase)

**Screens**
- `App/screens/SunScoutScreen.js` — full-screen `<Modal>`, same pattern as `DepletionLabScreen.js`. Hosts the live camera + AR overlay.
- `App/screens/SunAtlasScreen.js` — pushed overlay, same pattern as `StreaksScreen.js` → `BadgesScreen.js` (translateX + opacity slide). Hosts the collection board.

**Components** (one per file)
- `App/components/sunStamps/SkyScoutView.js` — camera passthrough + real compass/pitch-driven AR overlay (arc, hot zone, ghosts).
- `App/components/sunStamps/StampRevealCard.js` — the reveal card, prop-sized like `ProgressRing`.
- `App/components/sunStamps/StampChip.js` — small Atlas grid chip.
- `App/components/sunStamps/AtlasRow.js` — one labeled axis row.

**Services** — pure logic, no RN imports, standalone-testable in node, same convention as `DepletionLabService.js`:
- `App/services/SunPositionService.js` — new. Astronomy math only.
- `App/services/SunStampService.js` — new. The four rarity signals, tier resolution, deterministic "why" narration (same template approach as `SunRecapService.js`).
- **Reused, not duplicated**: `WeatherService.js` (atmospheric-luck signal), `LocationService.js` (place resolution), `AchievementService.js`'s latitude/altitude metric logic (Atlas row criteria).

**Data** — new Supabase table `sun_stamps` (`user_id`, `lat`, `lon`, `altitude_m`, `captured_at`, `tier`, `place_name`, per-axis qualifying values, best-of flags), added via a new file in `supabase/migrations/`, same pattern as the existing altitude migration.

**Entry point** — a card/CTA on `PassportScreen.js` opens `SunScoutScreen`; a capture routes into `SunAtlasScreen`, itself reachable both from that Passport entry and from inside the Scout modal.

**Permissions** — camera + motion sensors are new asks (location is already granted elsewhere in the app). Prime them with an explainer screen first, following `BluetoothPairingScreen.js`/`DeviceOnboardingScreen.js`'s existing precedent for BLE, rather than firing a cold OS dialog.

**Open, undecided**: whether a lightweight `SunStampContext` is needed — only if something *outside* Passport (e.g. a Home screen cue) needs to know a new stamp exists. Not needed for a Passport-only v1.

## Part 7 — Design specification

The design carries this feature. A stamp nobody wants to look at twice is a failed feature regardless of how correct the astronomy is. This part is binding, not suggestive.

### 7.1 The core tension — read first

This feature is used **outdoors, in direct sun**, on a phone at arm's length pointed at the sky. That splits the design into two different jobs, and conflating them will break it:

- **Scout HUD (outdoors, glare)** — obeys `CLAUDE.md`'s sunlight-readability rule absolutely: high contrast, large type, no subtle grays, no thin hairlines, no low-opacity text. Every control must survive a bright screen washed out by sunlight. Minimum text contrast against its backdrop, always over a scrim — never white text directly on sky.
- **Reveal card + Atlas (looked at later, often indoors)** — this is where the richness lives. Deep, moody, saturated, detailed. No sunlight constraint, because nobody browses their collection while squinting at the sky.

Design them as two different environments. The Reveal is the bridge — it appears outdoors but is the payoff moment, so it gets a heavy dark scrim behind it (≥70% opacity) to buy back the contrast its richness costs.

### 7.2 Type system — mapped to fonts that actually load

**Space Grotesk and Inter are off-limits for this feature** even though the app loads them. The usable set here is **Switzer**, **SF Pro Display**, **Outfit-Regular** (Regular only — heavier weights are deliberately not loaded), plus the serif decision below.

The app loads no serif and no monospace. The prototype's serif-italic plate names and mono coordinates are **not buildable as-is**. Two options, in order of preference:

**Recommended — add exactly one display serif for this feature.** The vintage-plate direction genuinely needs it; nothing in the current stack carries that voice. One face, one weight (Regular + Italic), loaded like Outfit already is. Something in the transitional/old-style register — Instrument Serif, Fraunces, or EB Garamond — used *only* for the stamp's place name and the Atlas header. This is the single highest-leverage aesthetic decision in the feature.

**Fallback if no new font is approved** — use `Outfit-Regular` at large sizes with tight letter-spacing for plate names. It's geometric rather than editorial, so the card reads modern-minimal instead of vintage-astronomical. Acceptable, meaningfully less distinctive.

Roles (using real loaded families):

| Role | Face | Size / spacing |
|---|---|---|
| Stamp place name | *new serif italic* (or `Outfit-Regular`) | 20–22, letter-spacing −0.3 |
| Tier label (reveal) | `Switzer-Bold` | 12.5, letter-spacing +0.06em, uppercase |
| "Why" narration line | `Outfit-Regular` | 15.5, line-height 1.45 |
| Coordinates / solar angle | `Switzer-Medium` + `fontVariant: ['tabular-nums']` | 10.5, letter-spacing +0.02em |
| Postmark ring text | `Switzer-Semibold` | 8.5, letter-spacing +2.2 |
| Atlas row label | `Switzer-Semibold` | 11, letter-spacing +0.09em, uppercase |
| Atlas chip name | serif italic (or `Outfit-Regular`) | 13 |
| Scout HUD readout | `Switzer-Bold` | 14 minimum — sunlight rule |

`fontVariant: ['tabular-nums']` on coordinates is the real substitute for a mono face — digits align in columns without needing a new font file.

### 7.3 Color — new tokens for `colors.js`

Per `CLAUDE.md`, no hex may live outside `colors.js`. Add a `stamp*` family following the existing `ach*`/`flame*` naming convention (start / accent / end / shade):

```
// Sun Stamp tiers — escalating rarity. Deliberately NOT a recolor of the
// achievement badge hues: those mark what you've done, these mark how rare
// the light itself was.
stampEverydayStart / Accent / End / Shade   // muted sky blue → bone
stampSeasonalStart / Accent / End / Shade   // dawn rose → amber
stampAlignmentStart / Accent / End / Shade  // magenta → ember orange
stampOnceStart / Accent / End / Shade       // deep indigo → violet → gold
stampSeal                                    // wax-seal brass, Once-a-Year only
stampPlate                                    // the dark scrim under plate text
```

Escalation must be legible **without reading the label** — the ordering cue is saturation + chroma range, not just hue: Everyday is near-neutral and quiet; each tier widens the gradient's chroma span; Once-a-Year is the only one that spans two distant hue families (violet→gold) and the only one that gets `stampSeal`.

Do not reuse `protected` / `warning` / `danger` anywhere in this feature. Those are the protection-status colors and are non-negotiable in meaning — borrowing them here would smuggle risk semantics into a feature that must not carry any.

### 7.4 The Reveal card — exact anatomy

- **Aspect 3:4**, width `min(300, screenWidth × 0.72)`, `borderRadius: 16`.
- **Layer stack, bottom to top**: sky gradient → radiating rays (conic, ~0.5 opacity, 70s rotation) → sun glow (radial, blurred) → grain (0.06 opacity overlay) → postmark → seal (Once-a-Year only) → double rule (inset 4) → dotted rule (inset 8) → plate scrim → plate text.
- **Plate scrim** is a vertical gradient from transparent at 0% to `stampPlate` at 100%, occupying the bottom ~34% — never a hard-edged bar.
- **Rays render in `react-native-svg`**, not layered Views — the app already depends on it (`ProgressRing`), and a real conic sweep isn't expressible in RN styles.
- **Postmark** is an SVG `textPath` on a circular path — the detail that sells "franked, one-of-a-kind." Two concentric rings, outer 1.2 stroke, inner 0.8 at half opacity.
- **Tier frame escalation**: Everyday = 1px `stampEverydayAccent`; Seasonal = 1.5px `stampSeasonalAccent` + soft outer glow; Alignment = 2px + slow shimmer along the gradient; Once-a-Year = 2px gradient border (violet→gold, needs a wrapper View with padding since RN can't gradient a border directly) + `stampSeal` medallion.

### 7.5 Atlas board

- Chips **104 × 92**, `borderRadius: 18`, gap 9, horizontal scroll per row — a shrunken echo of the Reveal card's language (same sky art, same dotted micro-frame inset 4), never a different, cheaper-looking system.
- **Empty slots**: 1.5px dashed `colors.border`, transparent fill, centered muted label naming the missing thing. They must read as *invitations*, not errors — never red, never an alert icon, never an exclamation.
- Rows use `FlatList` horizontally (per `CLAUDE.md`'s list rule) once a row can exceed ~10 chips, which the open-ended Place row will.
- Filled/empty ratio per row is shown as `n/m` in `Switzer-Bold` at the row's right edge, matching `BadgesScreen`'s existing section-count treatment exactly.

### 7.6 Motion — reuse the app's existing curves, don't invent

| Moment | Spec |
|---|---|
| Shutter press | scale 0.72 + borderRadius 30%, 160ms, then release |
| Flash | white, opacity 0→0.9 in 90ms, →0 in 280ms |
| Card entrance | scale 0.8→1, translateY 14→0, rotateZ −2°→0°, 480ms, `IOS_EASE_OUT` from `SlideInView.js` |
| Card dismiss → Atlas | card shrinks toward its destination chip, 320ms |
| Chip landing | the existing badge-unlock celebration from `useBadgeCelebration.js` — do not write a second celebration system |
| Scout rarity change | tier dot color cross-fade 200ms; never a jarring snap |
| Atlas screen push | translateX + opacity, `bezier(0.23, 1, 0.32, 1)`, 380ms in / 260ms out — identical to `BadgesScreen.js` |

Every one of these must respect reduced-motion. The rays' infinite rotation and the Alignment shimmer are the two ambient loops — both must stop entirely under `prefers-reduced-motion`, matching how `useBadgeIdleMotion.js` already gates its loops behind an `active` flag.

### 7.7 Non-negotiables

- Locked/empty states are never rendered in a warning color.
- No emoji anywhere in the UI — the seal is a drawn shape, not `✦` as text (the prototype cheated here).
- The stamp art must be generated from real capture values, never randomized at render time — the same stamp must look identical every time it's drawn, forever. Treat the recipe as immutable once captured.

## Reference prototypes (built this session, not final code)

- Sun Stamps v1 (mood-only, no rarity/Atlas): `https://claude.ai/code/artifact/d1ede1f7-f15b-4b09-a5b0-d22f9ed13753`
- The Atlas + Scout + Reveal card (current design): `https://claude.ai/code/artifact/102c8bf3-5ea4-49aa-8261-103fcd70ca66`

Both are HTML/CSS/JS mockups for visualizing interaction and visual language only — not a source for real implementation code (no compass/GPS/camera access in a browser artifact; sky positions and rarity in the prototypes are simulated, not the real algorithm above).
