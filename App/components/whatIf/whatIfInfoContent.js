// Plain-English explanations behind each ⓘ button on the What If screen.
// Data only — rendered by WhatIfInfoButton. A row with `dot` shows a
// chart-marker swatch in that color instead of an icon.

import colors from '../../constants/colors';

const whatIfInfoContent = {
  charts: {
    title: 'Reading the charts',
    rows: [
      {
        icon: 'analytics-outline',
        title: 'Two timelines',
        body: 'Gray is what actually happened that day — it never changes. Orange is the replay with your changes applied.',
      },
      {
        icon: 'trending-down-outline',
        title: 'The line',
        body: 'How much sunscreen protection you had left, minute by minute — 100% is freshly applied, 0% is nothing left. Sharp vertical drops are water events; jumps back up to 100% are reapplications.',
      },
      {
        dot: colors.navy,
        title: 'Blue dot — water event',
        body: 'A swim or splash. It instantly strips part of your protection — that’s the sharp drop.',
      },
      {
        dot: colors.protected,
        title: 'Green dot — reapplication',
        body: 'A moment you put more sunscreen on. The line resets to 100% here.',
      },
      {
        dot: colors.orange,
        title: 'Orange dot — application',
        body: 'Only appears if you set a late application: it marks the moment sunscreen finally went on after the unprotected opening minutes.',
      },
      {
        dot: colors.danger,
        title: 'Red dot — the alert',
        body: 'The moment the device would buzz you to reapply — where the line crosses the red dashed threshold. Earlier is worse; sliding later is better.',
      },
      {
        icon: 'checkmark-circle',
        color: colors.protected,
        title: 'Green checkmark',
        body: 'The alert never fired — your changes kept you protected the whole session.',
      },
    ],
  },
  result: {
    title: 'The result',
    rows: [
      {
        icon: 'time-outline',
        title: 'The big number',
        body: 'Compares the orange replay to your real session: how much sooner or later you’d have hit the first “reapply now” alert. “+42 min” in orange means your changes bought 42 extra minutes of protection. A red “−” number means they made things worse.',
      },
      {
        icon: 'remove-circle-outline',
        title: 'Why it says ±0',
        body: 'No difference between the two timelines. You’ll see this when the controls match what you actually did (like right after opening or resetting) — and also when neither version ever needed an alert, since there’s no alert time to compare.',
      },
      {
        icon: 'sunny-outline',
        title: 'Skin UV dose',
        body: 'How much UV actually reached your skin, in MEDs (a burn-risk unit). Lower is better — this is where SPF changes show up.',
      },
    ],
  },
  spf: {
    title: 'SPF',
    rows: [
      {
        icon: 'shield-outline',
        title: 'What it changes',
        body: 'SPF doesn’t change how fast sunscreen wears off, so the line stays the same. Higher SPF blocks more UV while you’re covered — watch the skin UV dose drop instead.',
      },
    ],
  },
  water: {
    title: 'Water resistance',
    rows: [
      {
        icon: 'water-outline',
        title: 'What it changes',
        body: 'How much protection each swim or splash strips away. A 40-min rating loses more per dip than an 80-min one — the drops on the line get deeper.',
      },
    ],
  },
  timing: {
    title: 'Application timing',
    rows: [
      {
        icon: 'hourglass-outline',
        title: 'What it changes',
        body: 'What if you’d applied late? Those opening minutes count as unprotected — the line sits at 0% until the sunscreen goes on, then starts at 100% from there.',
      },
    ],
  },
  reapply: {
    title: 'Reapplication',
    rows: [
      {
        icon: 'refresh-outline',
        title: 'What it changes',
        body: 'Each marker is a moment you reapply, jumping protection back to 100%. Drag one to see how the timing changes the rest of the session — or add one to a session where you never reapplied.',
      },
    ],
  },
  activity: {
    title: 'Activity level',
    rows: [
      {
        icon: 'fitness-outline',
        title: 'What it changes',
        body: 'More movement means more sweat and friction, which strips sunscreen faster — the whole line gets steeper. This replaces the recorded activity for the entire session.',
      },
    ],
  },
};

export default whatIfInfoContent;
