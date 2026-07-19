// Turns real session data through the real algorithm functions
// (Algorithm/js/depletionEngine.js) into the shape InsightsScreen's
// cards already expect. This is the seam InsightsScreen.js merges over
// mockData.insights — swapping in Supabase session history later means
// changing what's passed in here, not touching this function or the
// card components at all.
import {
  calculateLifetimeStats,
  calculateComplianceTrend,
  calculateInsightsRankings,
} from '../../Algorithm/js/depletionEngine.js';

const FACTOR_LABELS = {
  uv: 'UV intensity',
  heatHumidity: 'Heat & humidity',
  activity: 'Activity',
  skinType: 'Skin type',
  waterEvents: 'Water events',
};

// Some fields the cards expect (patterns.reapplyWindow, riskWindow,
// firstReapply, weakSpot, and everything in seasonal/sunscreen/body/
// risk/aiRead) aren't produced by any existing algorithm function yet —
// calculateInsightsRankings needs a `minutesToCriticalThreshold` per
// session that neither the mock data nor SessionService's real
// endSession() output currently populate. Those stay on mockData.insights
// until that gap is closed or the eventual Claude narrative layer lands.
export function buildComputedInsights(sessions) {
  const lifetime = calculateLifetimeStats(sessions);
  const complianceTrend = calculateComplianceTrend(sessions);
  const rankings = calculateInsightsRankings(sessions); // null below 5 sessions

  const stats = [
    { label: 'Lifetime sessions', value: String(lifetime.totalSessions) },
    { label: 'Hours monitored', value: `${lifetime.totalMonitoredHours}h` },
    { label: 'Lifetime UV dose', value: `${lifetime.lifetimeMEDDose} MEDs` },
    { label: 'Dose prevented', value: `${lifetime.lifetimeMEDPrevented} MEDs` },
  ];
  const alerts = `Your overall alert compliance rate is ${lifetime.overallComplianceRate}%.`;
  const water = `${lifetime.totalWaterEvents} water event${lifetime.totalWaterEvents === 1 ? '' : 's'} detected across your recorded sessions.`;

  let sensitivities = null;
  let topCulprit = null;
  let riskCombo = null;

  if (rankings) {
    sensitivities = rankings.vulnerabilityFactorsRanked.map((f) => ({
      label: FACTOR_LABELS[f.factor] ?? f.factor,
      value: Math.round(f.averagePercentage),
    }));

    const top = rankings.vulnerabilityFactorsRanked[0];
    topCulprit = `${FACTOR_LABELS[top.factor] ?? top.factor} has driven the largest share of your depletion, averaging ${Math.round(top.averagePercentage)}% of it across your sessions.`;

    if (rankings.highestRiskConditions.length) {
      const combo = rankings.highestRiskConditions[0];
      riskCombo = `Your riskiest recurring condition combination: ${combo.conditions}. ${combo.alertCount} alert${combo.alertCount === 1 ? '' : 's'} triggered under these conditions.`;
    }
  }

  return {
    sessionsAnalyzed: lifetime.totalSessions,
    complianceTrend: complianceTrend.trend,
    stats,
    alerts,
    water,
    sensitivities,
    topCulprit,
    riskCombo,
  };
}
