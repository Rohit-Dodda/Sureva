import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import mockData from '../constants/mockData';

export const REPORT_RANGES = [
  { key: 'last', label: 'Last session only' },
  { key: '30d', label: 'Last 30 days' },
  { key: '90d', label: 'Last 90 days' },
  { key: '6m', label: 'Last 6 months' },
  { key: 'all', label: 'All time' },
];

const RANGE_DAYS = { '30d': 30, '90d': 90, '6m': 183 };

const PATIENT = {
  name: 'Rohit Dodda',
  age: 24,
  fitzpatrick: 'Type III',
  skinNotes: 'No diagnosed skin conditions reported at onboarding.',
  medications: 'No photosensitizing medications or photosensitivity flags reported.',
  typicalSpf: 'SPF 50 (water-resistant, 80 min rated)',
  deviceId: 'SRV-0014-A3',
};

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function getSessionsForRange(rangeKey) {
  const sessions = [...mockData.sessions].sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  if (rangeKey === 'last') return sessions.slice(-1);
  if (rangeKey === 'all') return sessions;
  const days = RANGE_DAYS[rangeKey] ?? 30;
  const cutoff = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  return sessions.filter((s) => s.dateISO >= cutoff);
}

function sessionMeds(s) {
  return mockData.sessionDetails[s.id]?.skin.med.accumulated ?? 0;
}

function sessionAlerts(s) {
  const a = mockData.sessionDetails[s.id]?.alerts;
  if (!a) return { fired: 0, confirmed: 0, ignored: 0 };
  const confirmed = a.log.filter((l) => l.confirmed).length;
  return { fired: a.fired, confirmed, ignored: a.fired - confirmed };
}

function effectiveSpf(s) {
  const line = mockData.sessionDetails[s.id]?.skin.effectiveSpf.line ?? '';
  const m = line.match(/like SPF (\d+)/);
  return m ? Number(m[1]) : s.spf;
}

function weekStart(iso) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday
  return d.toISOString().slice(0, 10);
}

function fmtDate(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

// ─── Section builders ─────────────────────────────────────────

function headerHtml(sessions) {
  const from = fmtDate(sessions[0].dateISO);
  const to = fmtDate(sessions[sessions.length - 1].dateISO);
  return `
    <div class="rep-header">
      <div class="logo">SUREVA</div>
      <div class="rep-title">Sun Exposure Report</div>
    </div>
    <div class="patient-line">
      <span><strong>${esc(PATIENT.name)}</strong></span>
      <span>Age ${PATIENT.age}</span>
      <span>Fitzpatrick ${esc(PATIENT.fitzpatrick)}</span>
      <span>Report period: ${esc(from)} &ndash; ${esc(to)}</span>
    </div>
    <hr class="rule" />`;
}

function patientProfileHtml() {
  const rows = [
    ['Name', PATIENT.name],
    ['Age', String(PATIENT.age)],
    ['Fitzpatrick skin type', PATIENT.fitzpatrick],
    ['Skin condition notes', PATIENT.skinNotes],
    ['Medications / photosensitivity', PATIENT.medications],
    ['Typical sunscreen', PATIENT.typicalSpf],
    ['Device ID', PATIENT.deviceId],
  ];
  return `
    <h2>Patient Profile</h2>
    <table class="kv">${rows
      .map(([k, v]) => `<tr><td class="k">${esc(k)}</td><td>${esc(v)}</td></tr>`)
      .join('')}</table>`;
}

function executiveSummaryHtml(sessions) {
  const totalMin = sessions.reduce((a, s) => a + s.durationMinutes, 0);
  const hours = (totalMin / 60).toFixed(1);
  const meds = sessions.reduce((a, s) => a + sessionMeds(s), 0).toFixed(1);
  const fired = sessions.reduce((a, s) => a + sessionAlerts(s).fired, 0);
  const confirmed = sessions.reduce((a, s) => a + sessionAlerts(s).confirmed, 0);
  const compliance = fired ? Math.round((100 * confirmed) / fired) : 100;
  const avgScore = Math.round(sessions.reduce((a, s) => a + s.score, 0) / sessions.length);
  return `
    <h2>Executive Summary</h2>
    <p>Across this report period the patient completed <strong>${sessions.length}</strong> monitored
    outdoor session${sessions.length === 1 ? '' : 's'} totaling <strong>${hours} hours</strong>, accumulating a
    cumulative ultraviolet dose of <strong>${meds} MEDs</strong>. The patient confirmed
    ${confirmed} of ${fired} protection alerts, an overall compliance rate of
    <strong>${compliance}%</strong>, with an average session score of <strong>${avgScore}/100</strong>.
    The most significant behavioral observation of the period: alert response is consistently
    fast in the morning and during dry-land activity, but degrades markedly during water
    exposure — 4 of 5 lifetime ignored alerts occurred while the patient was swimming,
    coinciding with the patient's highest-risk exposure conditions.</p>`;
}

function uvSummaryHtml(sessions) {
  const weeks = new Map();
  sessions.forEach((s) => {
    const w = weekStart(s.dateISO);
    if (!weeks.has(w)) weeks.set(w, []);
    weeks.get(w).push(s);
  });
  const rows = [...weeks.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([w, list]) => {
      const hrs = (list.reduce((a, s) => a + s.durationMinutes, 0) / 60).toFixed(1);
      const meds = list.reduce((a, s) => a + sessionMeds(s), 0).toFixed(1);
      const avgUv = (list.reduce((a, s) => a + s.peakUV, 0) / list.length).toFixed(1);
      const fired = list.reduce((a, s) => a + sessionAlerts(s).fired, 0);
      const conf = list.reduce((a, s) => a + sessionAlerts(s).confirmed, 0);
      const comp = fired ? Math.round((100 * conf) / fired) : 100;
      return `<tr><td>Week of ${fmtDate(w)}</td><td>${list.length}</td><td>${hrs}</td><td>${meds}</td><td>${avgUv}</td><td>${comp}%</td></tr>`;
    })
    .join('');
  const total = sessions.reduce((a, s) => a + sessionMeds(s), 0).toFixed(1);
  return `
    <h2>UV Exposure Summary</h2>
    <table class="data">
      <tr><th>Week</th><th>Sessions</th><th>Outdoor hours</th><th>Cumulative MEDs</th><th>Avg UV index</th><th>Avg compliance</th></tr>
      ${rows}
    </table>
    <p class="note">Cumulative dose for the period was ${total} MEDs. Dermatological guidance for
    Fitzpatrick ${esc(PATIENT.fitzpatrick)} skin recommends remaining under approximately 3 MEDs per week
    and 12 MEDs per month; the patient's exposure remained within these limits throughout the period.</p>`;
}

function sessionLogHtml(sessions) {
  const rows = sessions
    .map((s) => {
      const a = sessionAlerts(s);
      const water = (mockData.sessionDetails[s.id]?.moments.waterEvents ?? []).length;
      return `<tr><td>${esc(s.date)}</td><td>${esc(s.startTime)}</td><td>${esc(s.duration)}</td><td>${s.peakUV}</td><td>${s.score}</td><td>${a.fired}</td><td>${a.confirmed}</td><td>${a.ignored}</td><td>${water}</td><td>SPF ${effectiveSpf(s)}</td></tr>`;
    })
    .join('');
  return `
    <h2>Session Log</h2>
    <table class="data">
      <tr><th>Date</th><th>Start</th><th>Duration</th><th>Peak UV</th><th>Score</th><th>Alerts</th><th>Confirmed</th><th>Ignored</th><th>Water events</th><th>Effective SPF</th></tr>
      ${rows}
    </table>`;
}

function depletionSvg(timeline, durationMinutes) {
  const W = 640, H = 200, PAD = 36;
  const x = (m) => PAD + (m / durationMinutes) * (W - 2 * PAD);
  const y = (pct) => H - PAD + (pct / 100) * (2 * PAD - H);
  const pts = timeline.map((p) => `${x(p.m).toFixed(1)},${y(p.pct).toFixed(1)}`).join(' ');
  const markers = timeline
    .map((p) => `<circle cx="${x(p.m).toFixed(1)}" cy="${y(p.pct).toFixed(1)}" r="2.4" fill="#111"/>`)
    .join('');
  const gridLines = [0, 25, 50, 75, 100]
    .map(
      (g) =>
        `<line x1="${PAD}" y1="${y(g)}" x2="${W - PAD}" y2="${y(g)}" stroke="#ddd" stroke-width="0.5"/>
         <text x="${PAD - 6}" y="${y(g) + 3}" font-size="9" fill="#555" text-anchor="end">${g}%</text>`
    )
    .join('');
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" xmlns="http://www.w3.org/2000/svg">
    ${gridLines}
    <polyline points="${pts}" fill="none" stroke="#111" stroke-width="1.5"/>
    ${markers}
    <text x="${W / 2}" y="${H - 6}" font-size="9" fill="#555" text-anchor="middle">Session time (minutes)</text>
  </svg>`;
}

function sessionBreakdownsHtml(sessions) {
  const blocks = sessions
    .map((s) => {
      const d = mockData.sessionDetails[s.id];
      if (!d) return '';
      const alerts = d.alerts.log
        .map((l, i) => `Alert ${i + 1}: ${esc(l.detail)}`)
        .join('. ');
      const water = d.moments.waterEvents.length
        ? d.moments.waterEvents
            .map((w) => `${esc(w.time)} (${esc(w.type.toLowerCase())}, &minus;${w.cut}% protection)`)
            .join('; ')
        : 'None recorded';
      const unprot = d.moments.longestUnprotected
        ? `${esc(d.moments.longestUnprotected.duration)} — ${esc(d.moments.longestUnprotected.text)}`
        : 'No unprotected window recorded.';
      return `
      <div class="session-block">
        <h3>${esc(s.date)} — ${esc(s.location)} (${esc(s.duration)}, peak UV ${s.peakUV})</h3>
        ${depletionSvg(d.timeline, s.durationMinutes)}
        <p><strong>Conditions turned aggressive:</strong> ${esc(d.drivers.aggressiveAt.time)}.
        ${esc(d.drivers.aggressiveAt.note)}</p>
        <p><strong>Water events:</strong> ${water}.</p>
        <p><strong>Alerts:</strong> ${d.alerts.fired} fired. ${alerts}.</p>
        <p><strong>Longest unprotected window:</strong> ${unprot}</p>
        <p><strong>UV dose:</strong> ${d.skin.med.accumulated} MEDs accumulated
        (mild-erythema threshold for this skin type: ${d.skin.med.threshold} MEDs).</p>
      </div>`;
    })
    .join('');
  return `<h2>Detailed Session Breakdowns</h2>${blocks}`;
}

function behavioralHtml() {
  const i = mockData.insights;
  return `
    <h2>Behavioral Analysis</h2>
    <p><strong>Compliance trend.</strong> ${esc(i.compliance.responseTrend)} ${esc(i.history.trend)}</p>
    <p><strong>Dominant depletion factors.</strong> ${esc(i.patterns.topCulprit)} ${esc(i.patterns.riskCombo)}</p>
    <p><strong>Tipping-point conditions.</strong> ${esc(i.patterns.riskWindow.text)} Depletion accelerates
    sharply when ultraviolet index exceeds approximately ${esc(i.body.thresholds[2].value)} concurrent
    with physical activity or water immersion.</p>
    <p><strong>Alert response.</strong> ${esc(i.compliance.fastSlow)} ${esc(i.compliance.ignoreCondition)}</p>
    <p><strong>Patterns of note.</strong> ${esc(i.patterns.weakSpot)} ${esc(i.compliance.flag)}</p>`;
}

function skinProfileUpdateHtml() {
  const i = mockData.insights;
  return `
    <h2>Skin Profile Update</h2>
    <p>The device's adaptive model has identified that this patient's sunscreen depletes
    <strong>${i.skinProfile.heroPct}% faster</strong> than the baseline prediction for their
    Fitzpatrick type and demographic profile. ${esc(i.skinProfile.population)}</p>
    <p><strong>Observed baseline.</strong> ${esc(i.skinProfile.baseline)}</p>
    <p><strong>Model confidence.</strong> ${esc(i.skinProfile.modelAccuracy)} The model has been
    trained on ${i.sessionsAnalyzed} monitored sessions to date.</p>
    <p><strong>Sunscreen performance.</strong> ${esc(i.sunscreen.waterVsDry)} ${esc(i.sunscreen.waterResistance)}</p>`;
}

function recommendationsHtml() {
  const i = mockData.insights;
  return `
    <h2>Recommendations</h2>
    <p><strong>SPF selection.</strong> Average observed effective protection across the period was
    SPF ${i.sunscreen.observed} against a labeled SPF ${i.sunscreen.labeled}.
    ${esc(i.sunscreen.recommendation)}</p>
    <p><strong>Reapplication frequency.</strong> ${esc(i.patterns.reapplyWindow)} A fixed reapplication
    interval of 60&ndash;70 minutes during water-exposure sessions is advised, independent of label
    water-resistance claims.</p>
    <p><strong>Condition-specific guidance.</strong> ${esc(i.risk.vulnerableType)} Treating every exit
    from water as a mandatory reapplication trigger would address the majority of this patient's
    unprotected exposure.</p>
    <p><strong>For discussion at appointment.</strong> ${esc(i.risk.projected)} Seasonal acceleration of
    the patient's depletion rate has been observed entering summer; a follow-up review of summer
    exposure data is suggested.</p>`;
}

function dataNotesHtml() {
  return `
    <h2>Data Notes</h2>
    <p class="note">The Sureva wearable measures ambient ultraviolet irradiance, temperature, humidity,
    motion, and water contact at regular intervals during monitored sessions. Sunscreen protection is
    estimated by a depletion model that begins at the labeled SPF at application and reduces effective
    protection over time according to measured UV intensity, heat and humidity, physical activity, water
    immersion, and an individually calibrated personal factor learned across sessions. One MED (minimal
    erythema dose) is the ultraviolet dose expected to produce barely perceptible skin reddening for the
    patient's Fitzpatrick type; cumulative MEDs in this report are computed from measured irradiance,
    estimated effective protection, and published erythemal weighting. The model is intentionally
    conservative and may overstate depletion. This report is informational, generated from consumer
    wearable data, and is not a substitute for clinical diagnosis or professional medical advice.</p>`;
}

// ─── Public API ───────────────────────────────────────────────

export function buildReportHtml(rangeKey, includeDetails) {
  const sessions = getSessionsForRange(rangeKey);
  if (!sessions.length) return null;
  return `<!DOCTYPE html><html><head><meta charset="utf-8" />
  <style>
    @page { margin: 48px 44px 56px 44px; }
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #111; font-size: 11px; line-height: 1.55; }
    h2 { font-family: Georgia, 'Times New Roman', serif; font-size: 16px; font-weight: 600; color: #111; margin: 26px 0 8px; }
    h3 { font-family: Georgia, 'Times New Roman', serif; font-size: 12.5px; font-weight: 600; margin: 18px 0 6px; }
    p { margin: 0 0 8px; color: #222; }
    .note { color: #444; font-size: 10px; }
    .rep-header { display: flex; justify-content: space-between; align-items: baseline; }
    .logo { font-family: Georgia, serif; font-size: 18px; letter-spacing: 4px; font-weight: 700; }
    .rep-title { font-family: Georgia, serif; font-size: 14px; color: #333; }
    .patient-line { margin-top: 8px; font-size: 10.5px; color: #333; }
    .patient-line span { margin-right: 14px; }
    .rule { border: none; border-top: 1px solid #111; margin: 10px 0 4px; }
    table { width: 100%; border-collapse: collapse; margin: 6px 0 10px; }
    table.kv td { padding: 3px 8px 3px 0; vertical-align: top; font-size: 10.5px; border-bottom: 0.5px solid #e2e2e2; }
    table.kv td.k { width: 200px; color: #444; }
    table.data th { font-size: 9.5px; text-align: left; border-bottom: 1px solid #111; padding: 4px 6px; color: #111; }
    table.data td { font-size: 10px; padding: 4px 6px; border-bottom: 0.5px solid #ddd; color: #222; }
    .session-block { page-break-inside: avoid; margin-bottom: 18px; }
    .pageno { position: fixed; bottom: -36px; width: 100%; text-align: center; font-size: 9px; color: #555; }
  </style></head><body>
  ${headerHtml(sessions)}
  ${patientProfileHtml()}
  ${executiveSummaryHtml(sessions)}
  ${uvSummaryHtml(sessions)}
  ${sessionLogHtml(sessions)}
  ${includeDetails ? sessionBreakdownsHtml(sessions) : ''}
  ${behavioralHtml()}
  ${skinProfileUpdateHtml()}
  ${recommendationsHtml()}
  ${dataNotesHtml()}
  </body></html>`;
}

export async function generateReport(rangeKey, includeDetails) {
  try {
    const html = buildReportHtml(rangeKey, includeDetails);
    if (!html) {
      return { ok: false, message: 'No sessions found in that date range.' };
    }
    const { uri } = await Print.printToFileAsync({ html });
    return { ok: true, uri };
  } catch (e) {
    console.log('Report generation failed:', e);
    return { ok: false, message: 'Could not generate the report. Please try again.' };
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
      dialogTitle: 'Share Sun Exposure Report',
    });
    return { ok: true };
  } catch (e) {
    console.log('Report sharing failed:', e);
    return { ok: false, message: 'Could not open the share sheet. Please try again.' };
  }
}
