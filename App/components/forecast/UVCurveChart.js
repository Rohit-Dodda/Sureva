import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Line, Rect, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import colors from '../../constants/colors';

const PAD_TOP = 16;
const PAD_BOTTOM = 22;
const PAD_RIGHT = 18; // room for the UV axis numbers
const UV_MAX = 11; // chart ceiling — UV index scale tops out around here
const UV_TICKS = [3, 6, 9]; // moderate / high / very-high boundaries

// UV index → colour band. Mirrors the personal risk legend used elsewhere.
function uvColor(uv) {
  if (uv >= 6) return colors.danger;
  if (uv >= 3) return colors.warning;
  return colors.protected;
}

// Today's UV index curve across the day. Risk zones are shaded behind the
// curve, the peak window is boxed, and both the current hour and the daily
// peak are marked with readable value labels.
export default React.memo(function UVCurveChart({
  hourly,
  peakStartIndex,
  peakEndIndex,
  nowIndex,
  nowUV,
  width,
  height,
}) {
  const plotW = width - PAD_RIGHT;
  const plotH = height - PAD_BOTTOM;

  const m = useMemo(() => {
    const xAt = (i) => (i / (hourly.length - 1)) * plotW;
    const yAt = (uv) => PAD_TOP + (1 - Math.min(uv, UV_MAX) / UV_MAX) * (plotH - PAD_TOP);

    // The curve is drawn from the once-daily hourly forecast, but "now" uses
    // a separately-sourced live reading (nowUV) that's often fresher — and
    // can disagree with what the forecast said for this hour. Splice the
    // live value into the series at nowIndex before drawing, so the curve
    // itself passes through the live point instead of the dot floating off
    // a line that was drawn from a different, stale value at that x.
    const liveUV = nowIndex != null ? (nowUV != null ? nowUV : hourly[nowIndex].uv) : null;
    const values = hourly.map((h, i) => (i === nowIndex && liveUV != null ? liveUV : h.uv));

    let d = `M ${xAt(0)} ${yAt(values[0])}`;
    for (let i = 1; i < values.length; i++) {
      const px = xAt(i - 1);
      const py = yAt(values[i - 1]);
      const cx = xAt(i);
      const cy = yAt(values[i]);
      const mx = (px + cx) / 2;
      d += ` Q ${px} ${py} ${mx} ${(py + cy) / 2} T ${cx} ${cy}`;
    }

    // Daily peak (first hour that hits the max UV), computed on the same
    // corrected series so it also stays consistent with the drawn curve.
    const maxUV = Math.max(...values);
    const peakIdx = values.findIndex((v) => v === maxUV);

    const startX = xAt(peakStartIndex);
    const endX = xAt(peakEndIndex);

    return {
      line: d,
      fill: `${d} L ${xAt(values.length - 1)} ${plotH} L 0 ${plotH} Z`,
      xAt,
      yAt,
      peakX: startX,
      peakW: endX - startX,
      now: nowIndex != null ? { x: xAt(nowIndex), y: yAt(liveUV), uv: liveUV } : null,
      peak: { x: xAt(peakIdx), y: yAt(maxUV), uv: maxUV },
    };
  }, [hourly, peakStartIndex, peakEndIndex, nowIndex, nowUV, plotW, plotH]);

  const tickEvery = 2;

  return (
    <View>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="uvFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.orange} stopOpacity="0.28" />
            <Stop offset="1" stopColor={colors.orange} stopOpacity="0.02" />
          </LinearGradient>
        </Defs>

        {/* Risk zones (faint full-width bands so height maps to risk) */}
        <Rect x="0" y={m.yAt(UV_MAX)} width={plotW} height={m.yAt(6) - m.yAt(UV_MAX)} fill={colors.danger} opacity={0.05} />
        <Rect x="0" y={m.yAt(6)} width={plotW} height={m.yAt(3) - m.yAt(6)} fill={colors.warning} opacity={0.05} />
        <Rect x="0" y={m.yAt(3)} width={plotW} height={plotH - m.yAt(3)} fill={colors.protected} opacity={0.05} />

        {/* Gridlines at UV ticks */}
        {UV_TICKS.map((t) => (
          <Line key={t} x1="0" y1={m.yAt(t)} x2={plotW} y2={m.yAt(t)} stroke={colors.border} strokeWidth="1" strokeDasharray="3,5" />
        ))}

        {/* Peak window box */}
        {m.peakW > 0 && (
          <>
            <Rect x={m.peakX} y={PAD_TOP} width={m.peakW} height={plotH - PAD_TOP} fill={colors.danger} opacity={0.07} />
            <Line x1={m.peakX} y1={PAD_TOP} x2={m.peakX} y2={plotH} stroke={colors.danger} strokeOpacity="0.3" strokeWidth="1" strokeDasharray="4,4" />
            <Line x1={m.peakX + m.peakW} y1={PAD_TOP} x2={m.peakX + m.peakW} y2={plotH} stroke={colors.danger} strokeOpacity="0.3" strokeWidth="1" strokeDasharray="4,4" />
          </>
        )}

        {/* Baseline */}
        <Line x1="0" y1={plotH} x2={plotW} y2={plotH} stroke={colors.border} strokeWidth="1" />

        <Path d={m.fill} fill="url(#uvFill)" />
        <Path d={m.line} stroke={colors.orange} strokeWidth="2.5" fill="none" strokeLinejoin="round" strokeLinecap="round" />

        {/* Peak marker */}
        <Circle cx={m.peak.x} cy={m.peak.y} r="4" fill={colors.white} stroke={uvColor(m.peak.uv)} strokeWidth="2.5" />

        {/* Current-hour marker */}
        {m.now && (
          <>
            <Circle cx={m.now.x} cy={m.now.y} r="7" fill={colors.orange} opacity={0.18} />
            <Circle cx={m.now.x} cy={m.now.y} r="4" fill={colors.orange} stroke={colors.white} strokeWidth="1.5" />
          </>
        )}
      </Svg>

      {/* Right-side UV axis numbers */}
      <View style={st.axis} pointerEvents="none">
        {UV_TICKS.map((t) => (
          <Text key={t} style={[st.axisLabel, { top: m.yAt(t) - 7 }]}>{t}</Text>
        ))}
      </View>

      {/* Peak value bubble */}
      <Text style={[st.peakVal, { left: m.peak.x - 14, top: m.peak.y - 24, color: uvColor(m.peak.uv) }]}>
        {m.peak.uv}
      </Text>

      {/* "Now" value bubble */}
      {m.now && (
        <Text style={[st.nowVal, { left: m.now.x - 18, top: m.now.y - 26 }]}>
          now {m.now.uv}
        </Text>
      )}

      {/* Hour labels */}
      <View style={st.labelRow} pointerEvents="none">
        {hourly.map((h, i) => (
          <Text
            key={h.hour}
            style={[
              st.label,
              { left: m.xAt(i) - 12, opacity: i % tickEvery === 0 ? 1 : 0 },
            ]}
          >
            {h.hour}
          </Text>
        ))}
      </View>
    </View>
  );
});

const st = StyleSheet.create({
  axis: {
    ...StyleSheet.absoluteFillObject,
  },
  axisLabel: {
    position: 'absolute',
    right: 0,
    width: 14,
    textAlign: 'right',
    fontFamily: 'Outfit-Regular',
    fontSize: 9.5,
    color: colors.muted,
  },
  peakVal: {
    position: 'absolute',
    width: 28,
    textAlign: 'center',
    fontFamily: 'Outfit-Regular',
    fontSize: 13,
    letterSpacing: -0.3,
  },
  nowVal: {
    position: 'absolute',
    width: 36,
    textAlign: 'center',
    fontFamily: 'Outfit-Regular',
    fontSize: 10,
    color: colors.orangeDark,
  },
  labelRow: {
    height: 14,
    marginTop: -16,
  },
  label: {
    position: 'absolute',
    width: 24,
    textAlign: 'center',
    fontFamily: 'Outfit-Regular',
    fontSize: 9.5,
    color: colors.muted,
  },
});
