# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Code Rules

Use functional components with hooks only. Never class components. One component per file. Name the file exactly the same as the component. Keep components small. If a component is over 150 lines, split it. Extract repeated UI patterns into /components immediately, never copy and paste JSX. Use React.memo on any component that recieves props and does not need to re-render on every parent update. 

Local state (useState) for anything that only one component needs. Context API for state shared across multiple screens (auth state, active session state, BLE connection state). Do not use Redux — it's overkill for this app. Context + local state is enough. Never store derived data in state. Calculate it from the source on render.

All styles go in StyleSheet.create({}) at the bottom of each file. Never inline styles.
All colors come from constants/colors.js. Never hardcode a hex value anywhere else.
Design for bright sunlight readability — high contrast, large text, no subtle grays.
Protection status colors are non-negotiable: green = #2ECC71, amber = #F39C12, red = #E74C3C.

Use FlatList for any list longer than ~10 items. Never ScrollView on long lists.
Use useCallback on any function passed as a prop to a child component.
Use useMemo on any expensive calculation that doesn't need to run every render.
BLE polling runs every 5 seconds during active session. Never more frequent than this.

All Firestore reads and writes go through FirebaseService.js. Screens never call Firebase directly.
Use onSnapshot listeners for real-time data (active session, family dashboard).
Use one-time getDoc for static data (user profile, past sessions).
Never read the same document twice in one session if the data hasn't changed.
Firestore schema is defined in CONTEXT.md. Do not deviate from it.

The JavaScript depletion engine (algorithm/js/depletionEngine.js) and the firmware C version must always produce identical outputs for identical inputs.
All multiplier values come from constants/algorithmConstants.js. Never hardcode a multiplier number anywhere else.
When in doubt, always be conservative — deplete faster rather than slower. Wrong direction = user thinks they're protected when they're not.

All screens use mockData.js until Week 6 BLE integration.
Build every screen to accept data as props so swapping from mock to real BLE data is just changing where the props come from.
Mock data must match the exact shape of real BLE data. Do not use shortcuts.

Every async function has a try/catch. No silent failures.
Firebase errors show a user-friendly message, not a raw error object.
BLE errors are logged and surfaced as a soft UI state, never a crash.
If the Claude API fails, show the session summary without the AI insight card. Never block the whole screen.

## Workflow

When the user provides a reference image (screenshot) and optionally some CSS classes or style notes:

1. **Generate** a single `index.html` file using Tailwind CSS (via CDN). Include all content inline — no external files unless requested.
2. **Screenshot** the rendered page using Puppeteer (`npx puppeteer screenshot index.html --fullpage` or equivalent). If the page has distinct sections, capture those individually too.
3. **Compare** your screenshot against the reference image. Check for mismatches in:
   - Spacing and padding (measure in px)
   - Font sizes, weights, and line heights
   - Colors (exact hex values)
   - Alignment and positioning
   - Border radii, shadows, and effects
   - Responsive behavior
   - Image/icon sizing and placement
4. **Fix** every mismatch found. Edit the HTML/Tailwind code.
5. **Re-screenshot** and compare again.
6. **Repeat** steps 3–5 until the result is within ~2–3px of the reference everywhere.

Do NOT stop after one pass. Always do at least 2 comparison rounds. Only stop when the user says so or when no visible differences remain.

## graphify

This project has a graphify knowledge graph at .graphify/.

Rules:
- For codebase or architecture questions, when `.graphify/graph.json` exists, first run `graphify query "<question>"` (or `graphify path "<A>" "<B>"` / `graphify explain "<concept>"`); these return a scoped subgraph, usually much smaller than `GRAPH_REPORT.md` or raw grep output
- If .graphify/wiki/index.md exists, navigate it instead of reading raw files
- If .graphify/graph.json is missing but graphify-out/graph.json exists, run `graphify migrate-state --dry-run` first; if tracked legacy artifacts are reported, ask before using the recommended `git mv -f graphify-out .graphify` and commit message
- If .graphify/needs_update exists or .graphify/branch.json has stale=true, warn before relying on semantic results and run /graphify . --update when appropriate
- Before proposing or committing .graphify artifacts, run `graphify portable-check .graphify`; commit-safe graph artifacts must use repo-relative paths, and never commit .graphify/branch.json, .graphify/worktree.json, .graphify/needs_update, or .graphify/cache/. If a repo already tracks any of them, first add them to .gitignore, then propose `git rm --cached .graphify/branch.json .graphify/worktree.json .graphify/needs_update` and `git rm -r --cached .graphify/cache`; never mutate git state without asking
- Before deep graph traversal, prefer `graphify summary --graph .graphify/graph.json` for compact first-hop orientation
- For review impact on changed files, use `graphify review-delta --graph .graphify/graph.json` instead of generic traversal
- Read `.graphify/GRAPH_REPORT.md` only for broad architecture review or when `query` / `path` / `explain` do not surface enough context
- After modifying code files in this session, run `npx graphify hook-rebuild` to keep the graph current
