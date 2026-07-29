import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import colors from '../../constants/colors';
import { project } from './skyProjection';

// The AR layer over the camera: today's sun path, the sun's current position,
// and ghost markers where past stamps were caught here.
//
// Purely presentational — it receives an already-computed arc and pointing
// state. All the astronomy lives in SunPositionService, all the rarity in
// SunStampService.
function SkyScoutView({ arc, sunPosition, ghosts = [], heading, elevation, width, height }) {
  // No compass reading yet (or no compass at all): park the sun at center so
  // the view is still usable rather than empty.
  const resolvedHeading = heading ?? sunPosition?.azimuth ?? 180;
  const resolvedElevation = heading == null ? (sunPosition?.altitude ?? 0) : elevation;

  const arcPath = useMemo(() => {
    if (!arc?.length) return null;
    let d = '';
    let penDown = false;
    for (const point of arc) {
      const p = project(point.azimuth, point.altitude, resolvedHeading, resolvedElevation, width, height);
      if (!p) { penDown = false; continue; }
      d += `${penDown ? 'L' : 'M'} ${p.x.toFixed(1)} ${p.y.toFixed(1)} `;
      penDown = true;
    }
    return d || null;
  }, [arc, resolvedHeading, resolvedElevation, width, height]);

  const sun = sunPosition
    ? project(sunPosition.azimuth, sunPosition.altitude, resolvedHeading, resolvedElevation, width, height)
    : null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <RadialGradient id="scoutSun" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={colors.stampSealLight} stopOpacity="1" />
            <Stop offset="40%" stopColor={colors.stampSeasonalAccent} stopOpacity="0.6" />
            <Stop offset="100%" stopColor={colors.stampSeasonalAccent} stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* Today's path, dashed so it reads as a trajectory rather than a
            solid object sitting in the sky. */}
        {arcPath ? (
          <Path
            d={arcPath}
            stroke={colors.white}
            strokeWidth={2.5}
            strokeDasharray="2 9"
            strokeLinecap="round"
            fill="none"
            opacity={0.5}
          />
        ) : null}

        {/* Past captures at this place, at their true historical positions. */}
        {ghosts.map((g, i) => {
          const p = project(g.azimuth, g.altitude, resolvedHeading, resolvedElevation, width, height);
          if (!p) return null;
          return (
            <Circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={10}
              fill={colors.white}
              fillOpacity={0.14}
              stroke={colors.white}
              strokeOpacity={0.55}
              strokeWidth={1}
            />
          );
        })}

        {sun ? (
          <>
            <Circle cx={sun.x} cy={sun.y} r={64} fill="url(#scoutSun)" />
            <Circle cx={sun.x} cy={sun.y} r={13} fill={colors.stampSealLight} opacity={0.95} />
          </>
        ) : null}
      </Svg>
    </View>
  );
}

export default React.memo(SkyScoutView);
