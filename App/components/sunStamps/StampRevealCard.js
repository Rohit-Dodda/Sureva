import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../../constants/colors';
import { artFor } from '../../constants/sunStamps';
import StampArt from './StampArt';
import StampPostmark from './StampPostmark';

// Formats a signed decimal degree as a hemisphere-suffixed reading — the way
// a chart or an instrument would print it, not the way a database stores it.
function formatLat(v) {
  return `${Math.abs(v).toFixed(2)}°${v >= 0 ? 'N' : 'S'}`;
}
function formatLon(v) {
  return `${Math.abs(v).toFixed(2)}°${v >= 0 ? 'E' : 'W'}`;
}

function formatTime(date) {
  const d = date instanceof Date ? date : new Date(date);
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

function formatDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

// The collectible itself, at full size. Everything printed on it is the real
// capture — coordinates, solar angle, timestamp — shown as decoration rather
// than hidden in a backend. That honesty IS the aesthetic: it reads like a
// scientific plate because the numbers on it are actually true.
function StampRevealCard({ stamp, width = 300 }) {
  const art = artFor(stamp.tier);
  const height = width * (4 / 3);

  const card = (
    <View style={[st.card, { width, height, borderRadius: RADIUS }]}>
      <StampArt tier={stamp.tier} width={width} height={height} borderRadius={RADIUS} />

      <View style={st.postmark} pointerEvents="none">
        <StampPostmark size={width * 0.2} date={stamp.capturedAt} />
      </View>

      {art.hasSeal ? (
        <LinearGradient
          colors={[colors.stampSealLight, colors.stampSeal]}
          start={{ x: 0.2, y: 0.1 }}
          end={{ x: 0.9, y: 1 }}
          style={[st.seal, { width: width * 0.115, height: width * 0.115, borderRadius: width * 0.0575 }]}
        >
          <View style={[st.sealPip, { width: width * 0.04, height: width * 0.04, borderRadius: width * 0.02 }]} />
        </LinearGradient>
      ) : null}

      {/* Double rule + dotted inner frame — the vintage-stamp cue. */}
      <View style={[st.rule, { borderRadius: RADIUS - 4, borderColor: colors.white }]} pointerEvents="none" />
      <View style={[st.dotted, { borderRadius: RADIUS - 8 }]} pointerEvents="none" />

      {/* Plate scrim fades in rather than sitting as a hard bar, so the sky
          appears to darken toward the label instead of being cut off. */}
      <LinearGradient
        colors={['rgba(10,8,4,0)', colors.stampPlate]}
        locations={[0, 0.62]}
        style={st.plate}
        pointerEvents="none"
      >
        <Text style={st.plateName} numberOfLines={1}>
          {stamp.placeName ?? 'Unnamed sky'}
        </Text>
        <Text style={st.plateDate}>
          {formatDate(stamp.capturedAt)} · {formatTime(stamp.capturedAt)}
        </Text>
        <Text style={st.plateCoords}>
          {formatLat(stamp.latitude)} {formatLon(stamp.longitude)} · ALT {Math.round(stamp.altitude)}° · AZ {String(Math.round(stamp.azimuth)).padStart(3, '0')}°
        </Text>
      </LinearGradient>
    </View>
  );

  // Only the top tier gets a gradient frame. RN can't gradient a border
  // directly, so it's a padded gradient wrapper with the card inset on top.
  if (art.hasSeal) {
    return (
      <LinearGradient
        colors={[colors.stampOnceAccent, colors.stampOnceEnd]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={{ padding: 2.5, borderRadius: RADIUS + 2.5 }}
      >
        {card}
      </LinearGradient>
    );
  }

  return (
    <View style={{ borderRadius: RADIUS + art.frameWidth, borderWidth: art.frameWidth, borderColor: art.accent }}>
      {card}
    </View>
  );
}

const RADIUS = 16;

const st = StyleSheet.create({
  card: {
    overflow: 'hidden',
    backgroundColor: colors.charcoal,
  },
  postmark: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  seal: {
    position: 'absolute',
    top: 12,
    left: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sealPip: {
    backgroundColor: colors.stampOnceShade,
    opacity: 0.55,
  },
  rule: {
    ...StyleSheet.absoluteFillObject,
    margin: 4,
    borderWidth: 1,
    opacity: 0.65,
  },
  dotted: {
    ...StyleSheet.absoluteFillObject,
    margin: 8,
    borderWidth: 1.5,
    borderStyle: 'dotted',
    borderColor: colors.white,
    opacity: 0.55,
  },
  plate: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 34,
    paddingHorizontal: 16,
    paddingBottom: 15,
  },
  plateName: {
    fontFamily: 'Outfit-Regular',
    fontSize: 21,
    letterSpacing: -0.3,
    color: colors.white,
    marginBottom: 3,
  },
  plateDate: {
    fontFamily: 'Switzer-Medium',
    fontSize: 11.5,
    color: colors.onDarkMuted,
    marginBottom: 6,
  },
  plateCoords: {
    fontFamily: 'Switzer-Medium',
    fontSize: 10.5,
    letterSpacing: 0.2,
    color: colors.onDarkMuted,
    // Tabular figures are the substitute for a mono face — the app loads no
    // monospace, and unaligned digits would break the instrument-readout look.
    fontVariant: ['tabular-nums'],
  },
});

export default React.memo(StampRevealCard);
