import React, { useMemo, useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Path, Circle, Line, Defs, LinearGradient, Stop } from 'react-native-svg';
import colors from '../../constants/colors';
import CardHeader from '../CardHeader';
import TrendInfoModal from './TrendInfoModal';
import { statusFor } from './sessionMath';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const W = 300;
const H = 96;
const PAD = 6;
const NOW_X = W - PAD; // the live "now" edge — always the right side

// Live protection-over-time trend. The timeline scrolls: "now" is pinned to
// the right edge, and reapply events are vertical flags planted at the moment
// they happened — so they drift left as time passes (time moves, not the flag).
export default React.memo(function SessionSparkline({ curve, reapplyEvents, elapsed }) {
  const pulse = useRef(new Animated.Value(0)).current;
  const [showInfo, setShowInfo] = useState(false);

  // Breathing "now" head so it reads as live.
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const { linePath, areaPath, flags, headY, lastColor } = useMemo(() => {
    if (!curve || curve.length < 2) {
      return { linePath: '', areaPath: '', flags: [], headY: PAD, lastColor: colors.protected };
    }
    const maxT = Math.max(elapsed, 1);
    const x = (t) => PAD + (t / maxT) * (W - PAD * 2);
    const y = (pct) => PAD + (1 - pct / 100) * (H - PAD * 2);

    let line = '';
    curve.forEach((p, i) => {
      line += `${i === 0 ? 'M' : 'L'}${x(p.t).toFixed(1)},${y(p.pct).toFixed(1)} `;
    });
    const area =
      `M${x(curve[0].t).toFixed(1)},${(H - PAD).toFixed(1)} ` +
      curve.map((p) => `L${x(p.t).toFixed(1)},${y(p.pct).toFixed(1)}`).join(' ') +
      ` L${x(curve[curve.length - 1].t).toFixed(1)},${(H - PAD).toFixed(1)} Z`;

    const planted = (reapplyEvents || []).map((t) => x(t));
    const lastPct = curve[curve.length - 1].pct;
    return {
      linePath: line.trim(),
      areaPath: area,
      flags: planted,
      headY: y(lastPct),
      lastColor: statusFor(lastPct).color,
    };
  }, [curve, reapplyEvents, elapsed]);

  const headR = pulse.interpolate({ inputRange: [0, 1], outputRange: [4, 6.5] });
  const haloOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] });
  const haloR = pulse.interpolate({ inputRange: [0, 1], outputRange: [5, 13] });

  return (
    <View style={st.card}>
      <CardHeader
        icon="pulse"
        title="Live protection trend"
        actionIcon="information-circle-outline"
        onActionPress={() => setShowInfo(true)}
      />
      <Svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={st.svg}>
        <Defs>
          <LinearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={lastColor} stopOpacity="0.22" />
            <Stop offset="100%" stopColor={lastColor} stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {/* Reapply flags — vertical lines planted at a moment in time */}
        {flags.map((fx, i) => (
          <React.Fragment key={i}>
            <Line
              x1={fx} y1={PAD} x2={fx} y2={H - PAD}
              stroke={colors.orange}
              strokeWidth={1.5}
              strokeDasharray="3 3"
              opacity={0.5}
            />
            <Circle cx={fx} cy={PAD + 1} r={3} fill={colors.orange} />
          </React.Fragment>
        ))}

        {areaPath ? <Path d={areaPath} fill="url(#sparkFill)" /> : null}
        {linePath ? (
          <Path d={linePath} stroke={lastColor} strokeWidth={2.5} fill="none" strokeLinejoin="round" />
        ) : null}

        {/* "Now" edge — the line's live head pinned to the right */}
        <Line
          x1={NOW_X} y1={PAD} x2={NOW_X} y2={H - PAD}
          stroke={colors.muted}
          strokeWidth={1}
          strokeDasharray="2 4"
          opacity={0.4}
        />
        <AnimatedCircle cx={NOW_X} cy={headY} r={haloR} fill={lastColor} opacity={haloOpacity} />
        <AnimatedCircle cx={NOW_X} cy={headY} r={headR} fill={lastColor} stroke={colors.white} strokeWidth={1.5} />
      </Svg>

      <View style={st.legendRow}>
        <Text style={[st.legend, st.legendLeft]}>Start</Text>
        <View style={[st.legendItem, st.legendCenter]}>
          <View style={st.flagSwatch} />
          <Text style={st.legend}>Reapplied</Text>
        </View>
        <Text style={[st.legend, st.nowLabel, st.legendRight]}>Now ▸</Text>
      </View>

      <TrendInfoModal visible={showInfo} onClose={() => setShowInfo(false)} />
    </View>
  );
});

const st = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  svg: { marginTop: 6 },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  legendLeft: {
    flex: 1,
    textAlign: 'left',
  },
  legendRight: {
    flex: 1,
    textAlign: 'right',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendCenter: {
    flex: 1,
    justifyContent: 'center',
  },
  flagSwatch: {
    width: 2,
    height: 11,
    borderRadius: 1,
    backgroundColor: colors.orange,
  },
  legend: {
    fontFamily: 'Inter-Regular',
    fontSize: 11,
    color: colors.muted,
  },
  nowLabel: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    color: colors.ink,
  },
});
