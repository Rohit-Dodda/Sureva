import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import mockData from '../constants/mockData';

// A personal "Your Sun Profile" report — everything Sureva has learned about
// the user: who they are, their numbers, trends, patterns, and what it means.
// Deliberately NOT session-by-session; it's the synthesized picture.

const PROFILE = {
  name: 'Rohit Dodda',
  age: 24,
  fitzpatrick: 'Type III',
  typicalSpf: 'SPF 50, water-resistant (80 min rated)',
};

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function todayStr() {
  return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// ─── Section builders ─────────────────────────────────────────

function headerHtml() {
  return `
    <div class="rep-header">
      <div class="logo">SUREVA</div>
      <div class="rep-title">Your Sun Profile</div>
    </div>
    <div class="profile-line">
      <span><strong>${esc(PROFILE.name)}</strong></span>
      <span>Age ${PROFILE.age}</span>
      <span>Fitzpatrick ${esc(PROFILE.fitzpatrick)}</span>
      <span>${mockData.insights.sessionsAnalyzed} sessions analyzed</span>
      <span>Generated ${esc(todayStr())}</span>
    </div>
    <hr class="rule" />`;
}

function aboutYouHtml() {
  const i = mockData.insights;
  return `
    <h2>The Short Version</h2>
    <p class="lead">${esc(i.aiRead)}</p>`;
}

function yourNumbersHtml() {
  const i = mockData.insights;
  const cards = i.history.stats
    .map((s) => `<div class="stat"><div class="stat-val">${esc(s.value)}</div><div class="stat-label">${esc(s.label)}</div></div>`)
    .join('');
  return `
    <h2>Your Numbers</h2>
    <div class="stat-grid">${cards}</div>
    <p>${esc(i.history.medContext)}</p>
    <p>${esc(i.history.alerts)} ${esc(i.history.water)}</p>
    <table class="kv">
      <tr><td class="k">Best session</td><td><strong>${i.history.best.score}/100</strong> — ${esc(i.history.best.text)}</td></tr>
      <tr><td class="k">Hardest session</td><td><strong>${i.history.worst.score}/100</strong> — ${esc(i.history.worst.text)}</td></tr>
    </table>`;
}

function yourSkinHtml() {
  const i = mockData.insights;
  const bars = i.skinProfile.sensitivities
    .map(
      (s) => `
      <div class="bar-row">
        <div class="bar-label">${esc(s.label)}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${s.value}%"></div></div>
        <div class="bar-val">${s.value}</div>
      </div>`
    )
    .join('');
  return `
    <h2>Your Skin</h2>
    <p>Sureva's model has learned that your skin depletes sunscreen
    <strong>${i.skinProfile.heroPct}% ${esc(i.skinProfile.heroLine)}</strong>.
    ${esc(i.skinProfile.population)}</p>
    <p><strong>Your calm-day baseline.</strong> ${esc(i.skinProfile.baseline)}</p>
    <h3>What your skin reacts to most</h3>
    <div class="bars">${bars}</div>
    <p class="note">${esc(i.skinProfile.modelAccuracy)}</p>`;
}

// Monthly depletion-rate line for the year so far.
function seasonalChartSvg() {
  const months = mockData.insights.seasonal.months;
  const W = 640, H = 180, PAD = 36;
  const known = months.filter((m) => m.rate != null);
  const maxRate = Math.max(...known.map((m) => m.rate), 0.8);
  const x = (idx) => PAD + (idx / (months.length - 1)) * (W - 2 * PAD);
  const y = (rate) => H - PAD - (rate / maxRate) * (H - 2 * PAD);
  const pts = months
    .map((m, idx) => (m.rate != null ? `${x(idx).toFixed(1)},${y(m.rate).toFixed(1)}` : null))
    .filter(Boolean)
    .join(' ');
  const dots = months
    .map((m, idx) =>
      m.rate != null
        ? `<circle cx="${x(idx).toFixed(1)}" cy="${y(m.rate).toFixed(1)}" r="2.6" fill="#FF5A1F"/>`
        : ''
    )
    .join('');
  const labels = months
    .map((m, idx) => `<text x="${x(idx).toFixed(1)}" y="${H - 12}" font-size="9" fill="#777" text-anchor="middle">${esc(m.m)}</text>`)
    .join('');
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" xmlns="http://www.w3.org/2000/svg">
    <line x1="${PAD}" y1="${H - PAD}" x2="${W - PAD}" y2="${H - PAD}" stroke="#ddd" stroke-width="0.5"/>
    <polyline points="${pts}" fill="none" stroke="#FF5A1F" stroke-width="1.8"/>
    ${dots}${labels}
    <text x="${PAD - 6}" y="${PAD + 4}" font-size="9" fill="#777" text-anchor="end">high</text>
    <text x="${PAD - 6}" y="${H - PAD}" font-size="9" fill="#777" text-anchor="end">low</text>
  </svg>`;
}

function yourTrendsHtml() {
  const i = mockData.insights;
  return `
    <h2>Your Trends</h2>
    <h3>Depletion rate through the year</h3>
    ${seasonalChartSvg()}
    <p>${esc(i.seasonal.yoy)}</p>
    <p><strong>Your riskiest stretch.</strong> ${esc(i.seasonal.highestRiskMonth)}</p>
    <p><strong>Where you're heading.</strong> ${esc(mockData.trends.year.insight)}</p>
    <p><strong>Getting better.</strong> ${esc(i.history.trend)} ${esc(i.compliance.responseTrend)}</p>
    <p class="note">${esc(i.seasonal.complianceShift)}</p>`;
}

function yourPatternsHtml() {
  const i = mockData.insights;
  return `
    <h2>Your Patterns</h2>
    <p><strong>What depletes you most.</strong> ${esc(i.patterns.topCulprit)}</p>
    <p><strong>Your high-risk window.</strong> ${esc(i.patterns.riskWindow.text)} ${esc(i.patterns.riskCombo)}</p>
    <p><strong>How you respond.</strong> ${esc(i.compliance.fastSlow)} ${esc(i.compliance.ignoreCondition)}</p>
    <p><strong>Reapplication.</strong> ${esc(i.patterns.firstReapply)} ${esc(i.patterns.reapplyWindow)}</p>
    <p><strong>Your weak spot.</strong> ${esc(i.patterns.weakSpot)} ${esc(i.compliance.flag)}</p>
    <table class="kv">
      <tr><td class="k">Current streak</td><td>${i.compliance.currentStreak} sessions</td></tr>
      <tr><td class="k">Best streak</td><td>${i.compliance.bestStreak} sessions</td></tr>
    </table>`;
}

function yourSunscreenHtml() {
  const i = mockData.insights;
  return `
    <h2>Your Sunscreen</h2>
    <p>Across your sessions, your sunscreen performed like an
    <strong>effective SPF ${i.sunscreen.observed}</strong> against a labeled
    SPF ${i.sunscreen.labeled}. ${esc(i.sunscreen.effectiveLine)}</p>
    <p><strong>Wet vs dry.</strong> ${esc(i.sunscreen.waterVsDry)} ${esc(i.sunscreen.waterResistance)}</p>
    <p><strong>Heat.</strong> ${esc(i.sunscreen.heat)}</p>`;
}

function yourBodyHtml() {
  const i = mockData.insights;
  const rows = i.body.thresholds
    .map((t) => `<tr><td class="k">${esc(t.label)} — ${esc(t.value)}</td><td>${esc(t.note)}</td></tr>`)
    .join('');
  return `
    <h2>Your Body</h2>
    <p>${esc(i.body.sweat)}</p>
    <p>${esc(i.body.activityImpact)}</p>
    <h3>The points where your protection starts to slip</h3>
    <table class="kv">${rows}</table>`;
}

function yourOutlookHtml() {
  const i = mockData.insights;
  const pct = Math.round((i.risk.monthDose.current / i.risk.monthDose.limit) * 100);
  return `
    <h2>Your Outlook</h2>
    <p>${esc(i.risk.monthDose.line)}</p>
    <div class="bar-row">
      <div class="bar-label">This month</div>
      <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
      <div class="bar-val">${i.risk.monthDose.current}/${i.risk.monthDose.limit}</div>
    </div>
    <p><strong>Projected for the year.</strong> ${esc(i.risk.projected)}</p>
    <p><strong>Your skin's clock.</strong> ${esc(i.risk.skinAge)}</p>
    <p><strong>Overall trend: ${esc(i.risk.trend.label)}.</strong> ${esc(i.risk.trend.text)}</p>`;
}

function whatToDoHtml() {
  const i = mockData.insights;
  return `
    <h2>What Would Help You Most</h2>
    <p><strong>Step up your SPF.</strong> ${esc(i.sunscreen.recommendation)} For your summer depletion rate, ${esc(i.seasonal.spfReco)}</p>
    <p><strong>Reapply on a clock, not on a feeling.</strong> ${esc(i.patterns.reapplyWindow)} Treat every exit from water as an automatic reapplication.</p>
    <p><strong>Mind your one vulnerable scenario.</strong> ${esc(i.risk.vulnerableType)} That single situation is where most of your risk lives.</p>`;
}

function footerHtml() {
  return `
    <hr class="rule thin" />
    <p class="note">This profile is built from your Sureva wearable, which measures UV, temperature,
    humidity, motion, and water contact during your sessions, plus a depletion model calibrated to your
    skin across ${mockData.insights.sessionsAnalyzed} sessions. One MED (minimal erythema dose) is the
    UV dose expected to barely redden your skin. The model errs conservative on purpose. This is your
    personal summary, not medical advice.</p>`;
}

// ─── Public API ───────────────────────────────────────────────

export function buildReportHtml() {
  return `<!DOCTYPE html><html><head><meta charset="utf-8" />
  <style>
    @page { margin: 48px 44px 56px 44px; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1A1712; font-size: 11px; line-height: 1.6; }
    h2 { font-family: Georgia, 'Times New Roman', serif; font-size: 17px; font-weight: 600; color: #1A1712; margin: 26px 0 8px; padding-bottom: 4px; border-bottom: 2px solid #FF5A1F; }
    h3 { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; color: #B23A0C; margin: 16px 0 6px; }
    p { margin: 0 0 9px; color: #2A2620; }
    p.lead { font-size: 12px; line-height: 1.7; }
    .note { color: #555; font-size: 10px; }
    .rep-header { display: flex; justify-content: space-between; align-items: baseline; }
    .logo { font-family: Georgia, serif; font-size: 20px; letter-spacing: 4px; font-weight: 700; color: #B23A0C; }
    .rep-title { font-family: Georgia, serif; font-size: 15px; color: #333; }
    .profile-line { margin-top: 8px; font-size: 10.5px; color: #444; }
    .profile-line span { margin-right: 14px; }
    .rule { border: none; border-top: 2px solid #1A1712; margin: 10px 0 4px; }
    .rule.thin { border-top: 0.5px solid #ccc; margin: 28px 0 8px; }
    table.kv { width: 100%; border-collapse: collapse; margin: 6px 0 10px; }
    table.kv td { padding: 5px 8px 5px 0; vertical-align: top; font-size: 10.5px; border-bottom: 0.5px solid #eee; }
    table.kv td.k { width: 190px; color: #555; font-weight: 600; }
    .stat-grid { display: flex; flex-wrap: wrap; gap: 10px; margin: 8px 0 12px; }
    .stat { flex: 1 1 21%; min-width: 110px; border: 1px solid #eee; border-radius: 8px; padding: 10px 12px; background: #FBF8F3; }
    .stat-val { font-family: Georgia, serif; font-size: 20px; font-weight: 700; color: #B23A0C; }
    .stat-label { font-size: 9.5px; color: #555; margin-top: 2px; }
    .bars { margin: 6px 0 10px; }
    .bar-row { display: flex; align-items: center; margin-bottom: 6px; }
    .bar-label { width: 150px; font-size: 10.5px; color: #2A2620; }
    .bar-track { flex: 1; height: 9px; background: #F0EAE1; border-radius: 5px; overflow: hidden; }
    .bar-fill { height: 9px; background: #FF5A1F; border-radius: 5px; }
    .bar-val { width: 46px; text-align: right; font-size: 10px; color: #555; }
    .keep { page-break-inside: avoid; }
  </style></head><body>
  ${headerHtml()}
  ${aboutYouHtml()}
  ${yourNumbersHtml()}
  ${yourSkinHtml()}
  ${yourTrendsHtml()}
  ${yourPatternsHtml()}
  ${yourSunscreenHtml()}
  ${yourBodyHtml()}
  ${yourOutlookHtml()}
  ${whatToDoHtml()}
  ${footerHtml()}
  </body></html>`;
}

export async function generateReport() {
  try {
    const html = buildReportHtml();
    const { uri } = await Print.printToFileAsync({ html });
    return { ok: true, uri };
  } catch (e) {
    console.log('Report generation failed:', e);
    return { ok: false, message: 'Could not generate your profile. Please try again.' };
  }
}

export async function shareReport(uri) {
  try {
    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      return { ok: false, message: 'Sharing is not available on this device.' };
    }
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: 'Share Your Sun Profile',
    });
    return { ok: true };
  } catch (e) {
    console.log('Report sharing failed:', e);
    return { ok: false, message: 'Could not open the share sheet. Please try again.' };
  }
}
