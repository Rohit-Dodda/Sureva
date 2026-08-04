@AGENTS.md

# Sureva App — Feature Overview

Sureva is a companion app for a UV-sensing wearable. The device measures real-time sun exposure and the app converts that into a live "sunscreen protection" percentage, alerting the user before they burn. This file documents what the app actually does so future work has the full picture, not just the code rules above.

## Auth & account (SignInScreen, AuthScreen, CheckEmailScreen, ForgotPasswordScreen, ResetPasswordScreen, MFAChallengeScreen)
- Email/password sign-up and sign-in via Supabase (`services/SupabaseService.js`, `services/supabase.js`).
- Email verification gate (`CheckEmailScreen`) between sign-up and first login.
- Forgot/reset password flow, including deep-linked reset tokens.
- Optional TOTP two-factor auth — a session only reaches full trust (AAL2) after `MFAChallengeScreen` clears, handled centrally in `AppNavigator` (`App.js`) alongside password-recovery routing.

## Onboarding (GetStartedScreen, OnboardingScreen, BluetoothPairingScreen, DeviceOnboardingScreen)
- Post-signup questionnaire capturing skin profile inputs: skin tone/Fitzpatrick type, age range, burn history, medications, skin conditions, referral source — persisted via `SupabaseService.completeOnboarding`.
- BLE pairing flow to connect the physical wearable, followed by device-specific onboarding slides.
- Debug-only flags in `App.js` (`FORCE_ONBOARDING_SCREEN_FOR_TESTING`, `FORCE_DEVICE_ONBOARDING_SCREEN_FOR_TESTING`) let engineers jump straight into either flow without recreating an account.

## Main app — 5 swipeable tabs (App.js, TabPager, FloatingTabBar)
`home → forecast → history → insights → streaks`, all mounted simultaneously for smooth swipe transitions; a floating liquid-glass tab bar controls navigation, and double-tapping a tab scroll-to-tops it.

- **Home** (`HomeScreen`) — current protection status at a glance, live session card, connection state, "conditions right now," last session summary.
- **Forecast** (`ForecastScreen`) — 7-day UV/burn-risk outlook for the user's skin, recommended SPF/sunscreen setup, and reapply-interval guidance, backed by `WeatherService`/EPA UV data and `LocationService`.
- **History** (`HistoryScreen`, `SessionDetailScreen`) — past sessions list with a protection-percentage timeline per session.
- **Insights** (`InsightsScreen`) — "Sureva's Read On You": computed rankings, compliance trends, and lifetime stats from `InsightsService`.
- **Streaks** (`StreaksScreen`) — daily-use streak tracking with calendar view, active/longest streak, milestone tiers.

## Active session tracking (ActiveSessionScreen, SessionDetailScreen)
- Live-updating protection percentage while a session is running, driven by BLE sensor readings polled every 5s.
- Alert states escalate as protection depletes ("reapply soon" → "final alert, reapply immediately"), with snooze/un-snooze handling and shade/water detection ("in the shade, you're covered", water-event cuts).
- iOS Live Activity / Dynamic Island support (`LiveActivityService.js`) mirrors session status on the lock screen; tapping it deep-links back into the active session (no in-place actions, since `expo-live-activity` has no App Intents support yet — see [[deferred-live-activity-appintent]] memory).
- Local reapply-reminder notifications (`NotificationService.js`), including in-app deep links from a tapped notification.
- Post-session check-in (`PostSessionService.js`) capturing how skin felt before/after.

## Depletion algorithm (Algorithm/js/depletionEngine.js, Algorithm/constants/algorithmConstants.js)
The core science: protection percentage depletes over time based on a combined multiplier of UV index, heat/humidity (WBGT approximation), activity level, skin type/Fitzpatrick, sensor placement, and water exposure. Key pieces:
- `calculateCombinedMultiplier`, `calculateUVMultiplier`, `calculateHeatHumidityMultiplier`, `calculateActivityMultiplier`, `calculateSkinTypeMultiplier`, `calculatePlacementCorrection`.
- Water-event handling: `classifyWaterEvent`, `applyWaterEventCut`, water-resistance-rated SPF decay.
- Session lifecycle: `initializeSession`, `runSessionInterval`, `confirmReapplication`, `evaluateAlertState`.
- Post-hoc scoring: `calculateSessionScore`, `calculateFactorBreakdown`, `calculateEffectiveSpf`, `calculateMEDDose` (minimal erythema dose), `calculateSweatLoad`, `calculateSkinStressScore`.
- This JS engine must stay numerically identical to the firmware C implementation (per root CLAUDE.md); all multipliers live in `algorithmConstants.js`, never hardcoded elsewhere.
- `DepletionLabScreen` / `DepletionLabService.js` is an internal "what happens if I set these conditions" timelapse simulator for testing the engine against arbitrary UV/temp/humidity/activity inputs.
- `WhatIfSimulatorScreen` / `SimulationService.js` lets a user replay a past session with hypothetical changes (different SPF, reapply timing, etc.) to see the score impact.

## Sun Recap (SunRecapScreen, RecapHistoryScreen, SunRecapService/Controller/Store)
A Spotify-Wrapped-style periodic recap: scratch-to-reveal / shake-to-reveal cards summarizing sun exposure since the last recap — standout sessions, patterns spotted ("higher UV, lower scores"), time in and out of the water, hours in the sun. Recaps are generated once and stored whole (never recomputed), with `RecapHistoryScreen` archiving past recaps and offering an on-demand preview when none exist yet.

## Streaks & badges (StreaksScreen, BadgesScreen, StreakService.js, AchievementService.js, BadgeGalleryService.js)
- Per-user streak engine (`StreakContext` + `StreakService.js`) tracks consecutive days of logged sun-protection activity, with tiered milestones and a calendar showing logged days.
- Badge gallery (`BadgesScreen`) displays earned/locked achievement badges; `AchievementService.js` evaluates unlock criteria. Note: 5 of 15 shipped badges are currently unearnable pre-BLE (no real data source yet — see [[achievement-badges-unearnable]] memory).

## Skin Age (SkinAgeScreen, SkinAgeService.js)
Estimates a "skin age" relative to chronological age based on cumulative sun exposure and protection compliance, with a reveal animation and trend history.

## Passport (PassportScreen, LocationDetailScreen)
A map-based view clustering sessions by location, surfacing per-place stats (average UV, average session score, average temperature/humidity, best-ever session, average alert-response time).

## Trends (TrendsScreen, TrendsMapper.js)
Monthly/weekly charts of burn-threshold proximity and protection patterns, with chevron month navigation and "Sureva's Read" narrative summaries.

## Profile & settings (ProfileScreen, SettingsScreen, EditSkinProfileScreen, NotificationSettingsScreen, HelpSupportScreen, AboutSurevaScreen)
- Edit name, email, password, avatar (camera or library upload).
- Edit skin profile (skin tone, burn history, medications, conditions) captured at onboarding.
- Notification preferences for reapply alerts.
- Data export — "Export My Data" downloads everything Sureva has on the account (`DataExportService.js`).
- Account deletion.
- Help/support, legal docs (Privacy Policy, Terms of Service, Accessibility Statement) in `AboutSurevaScreen`.

## Reports (ReportService.js)
Generates a shareable HTML/PDF session or period report (`buildReportHtml`) for exporting/printing sun-exposure summaries.

## Cross-cutting UI systems
- `QuickSearchContext` / `QuickSearchOverlay` — in-app command/search palette (BM25-style ranking over a `SEARCH_INDEX` of screens/cards).
- `AppTourContext` / `TourOverlay` — coach-mark onboarding tours, including milestone-triggered tours.
- `ScrollToTopContext`, `TabBarVisibilityContext`, `SwipeNavContext` — shared navigation/UX plumbing for the tab pager.

## Backend
- Supabase for auth (incl. MFA), Postgres storage, and session data (`public.users`, `public.sessions`, `public.session_readings`, `public.session_events`, `public.post_session_checkins`, `public.skin_age_snapshots`, `public.what_if_scenarios`).
- `mockData.js` still backs all screens pre-BLE integration (Week 6), matching the real BLE data shape exactly per root CLAUDE.md.
