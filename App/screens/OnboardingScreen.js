import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Animated,
  Dimensions,
  PanResponder,
  Modal,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import colors from '../constants/colors';

const { width } = Dimensions.get('window');
const TOTAL_STEPS = 5;

// ─── Skin tone ────────────────────────────────────────────────
const SKIN_TONES = [
  { id: 1, color: '#F3CBA4' },
  { id: 2, color: '#D4956A' },
  { id: 3, color: '#BF7A40' },
  { id: 4, color: '#8B5530' },
  { id: 5, color: '#7A3E1A' },
  { id: 6, color: '#2C0D05' },
];
const CIRCLE_SIZE = Math.floor((width - 64 - 40) / 3);

// ─── Age ranges ───────────────────────────────────────────────
const AGE_RANGES = [
  { id: 0, label: 'Under 12' },
  { id: 1, label: '12–50' },
  { id: 2, label: '51–64' },
  { id: 3, label: '65+' },
];
const TRACK_PADDING = 32;
const TRACK_WIDTH = width - TRACK_PADDING * 2;
const SEGMENT_WIDTH = TRACK_WIDTH / (AGE_RANGES.length - 1);
const THUMB_SIZE = 26;
const TRACK_H = 3;
const TRACK_CONTAINER_H = 56;

// ─── Burn rate ────────────────────────────────────────────────
const BURN_OPTIONS = [
  { id: 'very_fast', label: 'Very quickly',   sub: 'I burn within 15 minutes'   },
  { id: 'fast',      label: 'Fairly quickly', sub: 'I burn within 30 minutes'   },
  { id: 'moderate',  label: 'Moderately',     sub: 'I burn after about an hour' },
  { id: 'rarely',    label: 'Rarely',          sub: 'I barely burn at all'       },
  { id: 'unsure',    label: "I'm not sure",    sub: null                         },
];

// ─── Conditions info content ──────────────────────────────────
const INFO_CONTENT = {
  medications: {
    title: 'Photosensitizing Medications',
    body: 'These medications increase your skin\'s sensitivity to UV light, meaning you can burn faster and more severely than usual. Sureva uses this to shorten your reapplication intervals and alert you sooner.',
  },
  skinCondition: {
    title: 'Skin Conditions',
    body: 'Conditions like rosacea, eczema, psoriasis, and lupus make skin more reactive to UV damage. We use this to recommend more protective reapplication intervals and gentler exposure limits.',
  },
};

// ─── Skin type ────────────────────────────────────────────────
const SKIN_TYPES = [
  { id: 'normal', label: 'Normal' },
  { id: 'oily',   label: 'Oily'   },
  { id: 'dry',    label: 'Dry'    },
];
const CARD_GAP = 14;
const CARD_W = Math.floor((width - 64 - CARD_GAP * 2) / 3);

// Face illustration constants
const FW = CARD_W - 28;        // face width
const FH = Math.round(FW * 1.22); // face height (slightly oval)
const FACE_COLOR  = '#DDB896';
const FEAT_COLOR  = '#7A5540';

// ─── Step 0: skin tone ────────────────────────────────────────
function SkinToneStep({ value, onChange }) {
  return (
    <View style={shared.stepWrap}>
      <Text style={shared.heading}>What is your{'\n'}skin tone?</Text>
      <Text style={shared.sub}>
        Helps us calibrate UV protection to your skin's melanin level.
      </Text>
      <View style={skinStyles.grid}>
        {SKIN_TONES.map((tone) => {
          const selected = value === tone.id;
          return (
            <TouchableOpacity
              key={tone.id}
              style={[skinStyles.outer, selected && skinStyles.outerSelected]}
              onPress={() => onChange(tone.id)}
              activeOpacity={0.85}
            >
              <View style={[skinStyles.circle, { backgroundColor: tone.color }]}>
                <View style={skinStyles.sheenTop} />
                <View style={skinStyles.sheenBottom} />
              </View>
              {selected && <View style={skinStyles.ring} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Step 1: age ──────────────────────────────────────────────
function AgeStep({ value, onChange }) {
  const hasInteracted = useRef(value !== null);
  const thumbXVal    = useRef(value !== null ? value * SEGMENT_WIDTH : TRACK_WIDTH / 2);
  const dragIndex    = useRef(value);
  const startX       = useRef(thumbXVal.current);

  const thumbX     = useRef(new Animated.Value(thumbXVal.current)).current;
  const fillOpacity = useRef(new Animated.Value(value !== null ? 1 : 0)).current;
  const [activeIndex, setActiveIndex] = useState(value);

  const snapTo = (index) => {
    const clamped = Math.max(0, Math.min(index, AGE_RANGES.length - 1));
    dragIndex.current  = clamped;
    thumbXVal.current  = clamped * SEGMENT_WIDTH;

    if (!hasInteracted.current) {
      hasInteracted.current = true;
      Animated.timing(fillOpacity, { toValue: 1, duration: 200, useNativeDriver: false }).start();
    }

    setActiveIndex(clamped);
    onChange(clamped);

    Animated.spring(thumbX, {
      toValue: clamped * SEGMENT_WIDTH,
      tension: 180,
      friction: 10,
      useNativeDriver: false,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderGrant: () => { startX.current = thumbXVal.current; },
      onPanResponderMove: (_, g) => {
        const nx = Math.max(0, Math.min(startX.current + g.dx, TRACK_WIDTH));
        thumbXVal.current = nx;
        thumbX.setValue(nx);
        const ni = Math.round(nx / SEGMENT_WIDTH);
        if (ni !== dragIndex.current) { dragIndex.current = ni; setActiveIndex(ni); }
        if (!hasInteracted.current) {
          hasInteracted.current = true;
          Animated.timing(fillOpacity, { toValue: 1, duration: 200, useNativeDriver: false }).start();
        }
      },
      onPanResponderRelease: () => {
        snapTo(Math.round(thumbXVal.current / SEGMENT_WIDTH));
      },
    })
  ).current;

  const fillWidth = thumbX.interpolate({
    inputRange: [0, TRACK_WIDTH], outputRange: [0, TRACK_WIDTH], extrapolate: 'clamp',
  });

  const trackTop = (TRACK_CONTAINER_H - TRACK_H) / 2;
  const thumbTop = (TRACK_CONTAINER_H - THUMB_SIZE) / 2;

  return (
    <View style={shared.stepWrap}>
      <Text style={shared.heading}>How old are you?</Text>
      <Text style={shared.sub}>
        UV sensitivity varies with age. This helps us fine-tune your protection.
      </Text>
      <View style={ageStyles.sliderWrap}>
        <View style={[ageStyles.trackContainer, { height: TRACK_CONTAINER_H }]}>
          <View style={[ageStyles.trackBg, { top: trackTop }]} />
          <Animated.View style={[ageStyles.trackFill, { top: trackTop, width: fillWidth, opacity: fillOpacity }]} />
          {AGE_RANGES.map((_, i) => (
            <TouchableOpacity
              key={i}
              style={[ageStyles.tickHit, { left: i * SEGMENT_WIDTH - 16, top: trackTop - 10 }]}
              onPress={() => snapTo(i)}
              activeOpacity={0.7}
            >
              <View style={[
                ageStyles.tick,
                activeIndex !== null && i <= activeIndex ? ageStyles.tickActive : ageStyles.tickInactive,
              ]} />
            </TouchableOpacity>
          ))}
          <Animated.View
            style={[
              ageStyles.thumb,
              {
                top: thumbTop,
                left: -THUMB_SIZE / 2,
                opacity: hasInteracted.current ? 1 : 0.35,
                transform: [{ translateX: thumbX }],
              },
            ]}
            {...panResponder.panHandlers}
          />
        </View>
        <View style={ageStyles.labelsRow}>
          {AGE_RANGES.map((range, i) => (
            <TouchableOpacity key={i} onPress={() => snapTo(i)} activeOpacity={0.7}>
              <Text style={[ageStyles.label, activeIndex === i && ageStyles.labelActive]}>
                {range.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

// ─── Face illustration ────────────────────────────────────────
function FaceIllustration({ type }) {
  const lx  = (frac) => Math.round(FW * frac);
  const ty  = (frac) => Math.round(FH * frac);

  return (
    <View style={[faceStyles.face, { width: FW, height: FH, borderRadius: Math.round(FW * 0.52) }]}>

      {/* Left eye */}
      <View style={[faceStyles.eye, { left: lx(0.28) - 3, top: ty(0.33) - 3 }]} />
      {/* Right eye */}
      <View style={[faceStyles.eye, { left: lx(0.72) - 3, top: ty(0.33) - 3 }]} />

      {/* Nose — two tiny nostrils */}
      <View style={[faceStyles.nostril, { left: lx(0.43) - 2, top: ty(0.57) }]} />
      <View style={[faceStyles.nostril, { left: lx(0.57) - 2, top: ty(0.57) }]} />

      {/* Mouth */}
      <View style={[faceStyles.mouth, { left: lx(0.5) - 9, top: ty(0.71) }]} />

      {/* ── Oily: T-zone shine — layered ovals for soft radial glow ── */}
      {type === 'oily' && (
        <>
          {/* Forehead — 3 concentric ovals, outer→inner, fading in */}
          <View style={{ position: 'absolute', borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.07)', width: lx(0.54), height: ty(0.20), left: lx(0.5) - lx(0.27), top: ty(0.02) }} />
          <View style={{ position: 'absolute', borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.11)', width: lx(0.38), height: ty(0.14), left: lx(0.5) - lx(0.19), top: ty(0.04) }} />
          <View style={{ position: 'absolute', borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.17)', width: lx(0.22), height: ty(0.09), left: lx(0.5) - lx(0.11), top: ty(0.06) }} />

          {/* Nose bridge — 3 stacked ovals */}
          <View style={{ position: 'absolute', borderRadius: 8,  backgroundColor: 'rgba(255,255,255,0.07)', width: lx(0.24), height: ty(0.26), left: lx(0.5) - lx(0.12), top: ty(0.43) }} />
          <View style={{ position: 'absolute', borderRadius: 6,  backgroundColor: 'rgba(255,255,255,0.12)', width: lx(0.15), height: ty(0.20), left: lx(0.5) - lx(0.075), top: ty(0.45) }} />
          <View style={{ position: 'absolute', borderRadius: 4,  backgroundColor: 'rgba(255,255,255,0.18)', width: lx(0.08), height: ty(0.13), left: lx(0.5) - lx(0.04), top: ty(0.47) }} />

          {/* Chin — 3 concentric ovals */}
          <View style={{ position: 'absolute', borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.07)', width: lx(0.34), height: ty(0.10), left: lx(0.5) - lx(0.17), top: ty(0.83) }} />
          <View style={{ position: 'absolute', borderRadius: 8,  backgroundColor: 'rgba(255,255,255,0.12)', width: lx(0.22), height: ty(0.07), left: lx(0.5) - lx(0.11), top: ty(0.85) }} />
          <View style={{ position: 'absolute', borderRadius: 6,  backgroundColor: 'rgba(255,255,255,0.18)', width: lx(0.12), height: ty(0.04), left: lx(0.5) - lx(0.06), top: ty(0.865) }} />
        </>
      )}

      {/* ── Dry: flake chips ── */}
      {type === 'dry' && (
        <>
          <View style={[faceStyles.flake, { left: lx(0.13), top: ty(0.42), transform: [{ rotate: '22deg'  }] }]} />
          <View style={[faceStyles.flake, { left: lx(0.72), top: ty(0.45), transform: [{ rotate: '-18deg' }], width: 4 }]} />
          <View style={[faceStyles.flake, { left: lx(0.14), top: ty(0.57), transform: [{ rotate: '10deg'  }], width: 6 }]} />
          <View style={[faceStyles.flake, { left: lx(0.70), top: ty(0.61), transform: [{ rotate: '-28deg' }] }]} />
          <View style={[faceStyles.flake, { left: lx(0.29), top: ty(0.17), transform: [{ rotate: '16deg'  }], width: 4 }]} />
          <View style={[faceStyles.flake, { left: lx(0.62), top: ty(0.21), transform: [{ rotate: '-12deg' }] }]} />
        </>
      )}
    </View>
  );
}

// ─── Step 2: skin type ────────────────────────────────────────
function SkinTypeStep({ value, onChange }) {
  return (
    <View style={shared.stepWrap}>
      <Text style={shared.heading}>What is your{'\n'}skin type?</Text>
      <Text style={shared.sub}>
        This helps us understand how quickly your skin absorbs and breaks down sunscreen.
      </Text>
      <View style={stStyles.row}>
        {SKIN_TYPES.map((type) => {
          const selected = value === type.id;
          return (
            <TouchableOpacity
              key={type.id}
              style={[stStyles.card, selected && stStyles.cardSelected]}
              onPress={() => onChange(type.id)}
              activeOpacity={0.85}
            >
              <Text style={[stStyles.label, selected && stStyles.labelSelected]}>
                {type.label}
              </Text>
              <FaceIllustration type={type.id} />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Step 3: burn rate ────────────────────────────────────────
function BurnRateStep({ value, onChange }) {
  return (
    <View style={shared.stepWrap}>
      <Text style={shared.heading}>How quickly do you{'\n'}burn in direct sun?</Text>
      <Text style={[shared.sub, burnStyles.subOverride]}>
        This helps us calculate how sensitive your skin is to UV exposure.
      </Text>
      <View style={burnStyles.list}>
        {BURN_OPTIONS.map((opt) => {
          const isUnsure = opt.id === 'unsure';
          const selected = value === opt.id;
          return (
            <TouchableOpacity
              key={opt.id}
              style={[
                isUnsure ? burnStyles.tileUnsure : burnStyles.tile,
                selected && (isUnsure ? burnStyles.tileUnsureSelected : burnStyles.tileSelected),
                isUnsure && burnStyles.tileUnsureMargin,
              ]}
              onPress={() => onChange(opt.id)}
              activeOpacity={0.85}
            >
              {isUnsure ? (
                <Text style={[burnStyles.unsureLabel, selected && burnStyles.unsureLabelSelected]}>
                  {opt.label}
                </Text>
              ) : (
                <>
                  <Text style={[burnStyles.tileLabel, selected && burnStyles.tileLabelSelected]}>
                    {opt.label}
                  </Text>
                  <Text style={[burnStyles.tileSub, selected && burnStyles.tileSubSelected]}>
                    {opt.sub}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Toggle switch ────────────────────────────────────────────
const TOG_W  = 46;
const TOG_H  = 26;
const THUMB_D = 20;
const TRAVEL  = TOG_W - THUMB_D - 6;

function Toggle({ value, onToggle }) {
  const thumbAnim = useRef(new Animated.Value(value ? 1 : 0)).current;
  const colorAnim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(thumbAnim, { toValue: value ? 1 : 0, tension: 220, friction: 13, useNativeDriver: true }),
      Animated.timing(colorAnim, { toValue: value ? 1 : 0, duration: 180, useNativeDriver: false }),
    ]).start();
  }, [value]);

  const translateX = thumbAnim.interpolate({ inputRange: [0, 1], outputRange: [3, TRAVEL + 3] });
  const bgColor    = colorAnim.interpolate({ inputRange: [0, 1], outputRange: [colors.surface, colors.orange] });

  return (
    <TouchableOpacity onPress={onToggle} activeOpacity={0.85}>
      <Animated.View style={[togSt.track, { width: TOG_W, height: TOG_H, backgroundColor: bgColor }]}>
        <Animated.View style={[togSt.thumb, { transform: [{ translateX }] }]} />
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Toggle row ───────────────────────────────────────────────
function ToggleRow({ label, sub, value, onToggle, onInfo }) {
  return (
    <View style={condSt.row}>
      <View style={condSt.rowLeft}>
        <View style={condSt.labelLine}>
          <Text style={condSt.rowLabel}>{label}</Text>
        </View>
        <Text style={condSt.rowSub}>{sub}</Text>
        <TouchableOpacity
          onPress={onInfo}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={condSt.infoBtn}
        >
          <View style={condSt.infoCircle}>
            <Text style={condSt.infoI}>i</Text>
          </View>
        </TouchableOpacity>
      </View>
      <Toggle value={value} onToggle={onToggle} />
    </View>
  );
}

// ─── Info bottom sheet ────────────────────────────────────────
function InfoSheet({ type, onClose }) {
  const slideAnim = useRef(new Animated.Value(280)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const dragY     = useRef(new Animated.Value(0)).current;
  const dragYVal  = useRef(0);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
    ]).start();
  }, []);

  const close = () => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(dragY,     { toValue: 320, duration: 200, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => { dragYVal.current = 0; },
      onPanResponderMove:  (_, g) => {
        if (g.dy < 0) return;
        dragYVal.current = g.dy;
        dragY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (dragYVal.current > 80 || g.vy > 0.5) {
          close();
        } else {
          Animated.spring(dragY, { toValue: 0, tension: 140, friction: 10, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  // Overlay dims as you drag down
  const overlayOpacity = Animated.multiply(
    fadeAnim,
    dragY.interpolate({ inputRange: [0, 220], outputRange: [1, 0], extrapolate: 'clamp' })
  );

  const sheetTranslate = Animated.add(slideAnim, dragY);
  const info = INFO_CONTENT[type];

  return (
    <Modal transparent animationType="none" onRequestClose={close}>
      <Animated.View style={[sheetSt.overlay, { opacity: overlayOpacity }]}>
        <TouchableOpacity style={sheetSt.dismiss} activeOpacity={1} onPress={close} />
      </Animated.View>
      <Animated.View style={[sheetSt.sheet, { transform: [{ translateY: sheetTranslate }] }]}>
        <View style={sheetSt.handleWrap} {...panResponder.panHandlers}>
          <View style={sheetSt.handle} />
        </View>
        <Text style={sheetSt.title}>{info.title}</Text>
        <Text style={sheetSt.body}>{info.body}</Text>
        <TouchableOpacity style={sheetSt.gotItBtn} onPress={close} activeOpacity={0.85}>
          <Text style={sheetSt.gotItText}>Got it</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

// ─── Step 4: conditions ───────────────────────────────────────
function ConditionsStep({ medications, skinCondition, noneSelected, onChangeMeds, onChangeSkin, onChangeNone }) {
  const [infoType, setInfoType] = useState(null);

  const handleMedsToggle = () => {
    const next = !medications;
    onChangeMeds(next);
    if (next) onChangeNone(false);
  };

  const handleSkinToggle = () => {
    const next = !skinCondition;
    onChangeSkin(next);
    if (next) onChangeNone(false);
  };

  const handleNone = () => {
    onChangeNone(true);
    onChangeMeds(false);
    onChangeSkin(false);
  };

  return (
    <View style={shared.stepWrap}>
      <Text style={shared.heading}>Anything we should{'\n'}know about your skin?</Text>
      <Text style={[shared.sub, { marginBottom: 32 }]}>
        Some medications and skin conditions affect how quickly sunscreen breaks down on your skin.
      </Text>

      <View style={condSt.card}>
        <ToggleRow
          label="I take photosensitizing medications"
          sub="e.g. antibiotics, retinoids, certain blood pressure meds"
          value={medications}
          onToggle={handleMedsToggle}
          onInfo={() => setInfoType('medications')}
        />
        <View style={condSt.divider} />
        <ToggleRow
          label="I have a skin condition"
          sub="e.g. rosacea, eczema, lupus, psoriasis"
          value={skinCondition}
          onToggle={handleSkinToggle}
          onInfo={() => setInfoType('skinCondition')}
        />
      </View>

      <TouchableOpacity
        style={[condSt.noneBox, noneSelected && condSt.noneBoxSelected]}
        onPress={handleNone}
        activeOpacity={0.7}
      >
        <View style={[condSt.noneCheck, noneSelected && condSt.noneCheckSelected]}>
          {noneSelected && <Text style={condSt.noneCheckMark}>✓</Text>}
        </View>
        <Text style={[condSt.noneLabel, noneSelected && condSt.noneLabelSelected]}>
          I have none of the above
        </Text>
      </TouchableOpacity>

      {infoType && <InfoSheet type={infoType} onClose={() => setInfoType(null)} />}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────
export default function OnboardingScreen({ onBack, onContinue }) {
  const [step,          setStep         ] = useState(0);
  const [skinTone,      setSkinTone     ] = useState(null);
  const [ageRange,      setAgeRange     ] = useState(null);
  const [skinType,      setSkinType     ] = useState(null);
  const [burnRate,      setBurnRate     ] = useState(null);
  const [medications,   setMedications  ] = useState(false);
  const [skinCondition, setSkinCondition] = useState(false);
  const [noneSelected,  setNoneSelected ] = useState(false);

  const contentOpacity   = useRef(new Animated.Value(0)).current;
  const contentTranslate = useRef(new Animated.Value(40)).current;
  const btnScale         = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentOpacity,   { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.spring(contentTranslate, { toValue: 0, tension: 55, friction: 9, useNativeDriver: true }),
    ]).start();
  }, []);

  const transition = (nextStep, dir) => {
    Animated.parallel([
      Animated.timing(contentOpacity,   { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(contentTranslate, { toValue: -20 * dir, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setStep(nextStep);
      contentTranslate.setValue(20 * dir);
      Animated.parallel([
        Animated.timing(contentOpacity,   { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(contentTranslate, { toValue: 0, tension: 55, friction: 9, useNativeDriver: true }),
      ]).start();
    });
  };

  const handleBack = () => {
    if (step === 0) { onBack && onBack(); return; }
    transition(step - 1, -1);
  };

  const canContinue =
    step === 0 ? skinTone !== null :
    step === 1 ? ageRange !== null :
    step === 2 ? skinType !== null :
    step === 3 ? burnRate !== null :
    medications || skinCondition || noneSelected;

  const buildAnswers = () => ({
    skinTone,
    ageRange,
    skinType,
    burnRate: burnRate === 'unsure' ? 'moderate' : burnRate,
    medications,
    skinCondition,
  });

  const handleContinue = () => {
    if (!canContinue) return;
    if (step < 4) { transition(step + 1, 1); return; }
    onContinue && onContinue(buildAnswers());
  };

  const handleSkip = () => {
    onContinue && onContinue({ ...buildAnswers(), medications: false, skinCondition: false });
  };

  const handlePressIn  = () => { if (!canContinue) return; Animated.spring(btnScale, { toValue: 0.96, tension: 120, friction: 6, useNativeDriver: true }).start(); };
  const handlePressOut = () => { Animated.spring(btnScale, { toValue: 1, tension: 100, friction: 5, useNativeDriver: true }).start(); };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />

      {/* Top bar — never animates */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.7}>
          <View style={styles.backArrow}>
            <View style={styles.arrowStem} />
            <View style={styles.arrowHeadTop} />
            <View style={styles.arrowHeadBottom} />
          </View>
        </TouchableOpacity>

        <View style={styles.stepsRow}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <View
              key={i}
              style={[styles.stepDot, i <= step ? styles.stepDotActive : styles.stepDotInactive]}
            />
          ))}
        </View>

        <View style={styles.topBarSpacer} />
      </View>

      {/* Content — only this fades/slides between steps */}
      <Animated.View
        style={[
          styles.content,
          { opacity: contentOpacity, transform: [{ translateY: contentTranslate }] },
        ]}
      >
        {step === 0 && <SkinToneStep    value={skinTone}     onChange={setSkinTone}      />}
        {step === 1 && <AgeStep         value={ageRange}     onChange={setAgeRange}      />}
        {step === 2 && <SkinTypeStep    value={skinType}     onChange={setSkinType}      />}
        {step === 3 && <BurnRateStep    value={burnRate}     onChange={setBurnRate}      />}
        {step === 4 && (
          <ConditionsStep
            medications={medications}
            skinCondition={skinCondition}
            noneSelected={noneSelected}
            onChangeMeds={setMedications}
            onChangeSkin={setSkinCondition}
            onChangeNone={setNoneSelected}
          />
        )}
      </Animated.View>

      {/* Footer */}
      <View style={styles.footer}>
        <Animated.View style={{ transform: [{ scale: btnScale }] }}>
          <TouchableOpacity
            style={[styles.continueBtn, canContinue && styles.continueBtnActive]}
            onPress={handleContinue}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={1}
          >
            <Text style={[styles.continueBtnText, canContinue && styles.continueBtnTextActive]}>
              Continue
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

// ─── Shared step styles ───────────────────────────────────────
const shared = StyleSheet.create({
  stepWrap: { flex: 1 },
  heading: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 36,
    color: colors.ink,
    letterSpacing: -1.1,
    lineHeight: 42,
    marginBottom: 14,
  },
  sub: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: colors.muted,
    lineHeight: 24,
    marginBottom: 52,
    maxWidth: 300,
  },
});

// ─── Skin tone styles ─────────────────────────────────────────
const skinStyles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    justifyContent: 'center',
  },
  outer: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    padding: 4,
    borderWidth: 2.5,
    borderColor: 'transparent',
  },
  outerSelected: {
    borderColor: colors.orange,
    backgroundColor: colors.orangeLight + '30',
  },
  circle: {
    flex: 1,
    borderRadius: 999,
    overflow: 'hidden',
  },
  sheenTop: {
    position: 'absolute',
    top: '10%', left: '14%',
    width: '38%', height: '34%',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.20)',
  },
  sheenBottom: {
    position: 'absolute',
    bottom: '8%', right: '10%',
    width: '30%', height: '26%',
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  ring: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 999,
    borderWidth: 2.5,
    borderColor: colors.orange,
  },
});

// ─── Age slider styles ────────────────────────────────────────
const ageStyles = StyleSheet.create({
  sliderWrap: {},
  trackContainer: {
    position: 'relative',
    width: TRACK_WIDTH,
  },
  trackBg: {
    position: 'absolute',
    left: 0, right: 0,
    height: TRACK_H,
    borderRadius: 2,
    backgroundColor: colors.surface,
  },
  trackFill: {
    position: 'absolute',
    left: 0,
    height: TRACK_H,
    borderRadius: 2,
    backgroundColor: colors.orange,
  },
  tickHit: {
    position: 'absolute',
    width: 32, height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tick: { width: 10, height: 10, borderRadius: 5 },
  tickActive:   { backgroundColor: colors.orange   },
  tickInactive: { backgroundColor: colors.border },
  thumb: {
    position: 'absolute',
    width: THUMB_SIZE, height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: colors.orange,
    borderWidth: 3,
    borderColor: colors.white,
    shadowColor: colors.orange,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: TRACK_WIDTH,
    marginTop: 14,
  },
  label: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: colors.muted,
  },
  labelActive: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    color: colors.ink,
  },
});

// ─── Face illustration styles ─────────────────────────────────
const faceStyles = StyleSheet.create({
  face: {
    backgroundColor: FACE_COLOR,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  eye: {
    position: 'absolute',
    width: 6, height: 6,
    borderRadius: 3,
    backgroundColor: FEAT_COLOR,
  },
  nostril: {
    position: 'absolute',
    width: 4, height: 4,
    borderRadius: 2,
    backgroundColor: FEAT_COLOR,
    opacity: 0.45,
  },
  mouth: {
    position: 'absolute',
    width: 18, height: 3,
    borderRadius: 3,
    backgroundColor: FEAT_COLOR,
    opacity: 0.65,
  },
  flake: {
    position: 'absolute',
    width: 5, height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.62)',
  },
});

// ─── Skin type card styles ────────────────────────────────────
const stStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: CARD_GAP,
    justifyContent: 'center',
  },
  card: {
    width: CARD_W,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingTop: 16,
    paddingBottom: 20,
    alignItems: 'center',
  },
  cardSelected: {
    borderColor: colors.orange,
    backgroundColor: colors.orangeLight + '30',
  },
  label: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 14,
    color: colors.muted,
    marginBottom: 14,
    letterSpacing: 0.1,
  },
  labelSelected: {
    color: colors.orange,
  },
});

// ─── Burn rate styles ─────────────────────────────────────────
const burnStyles = StyleSheet.create({
  subOverride: {
    marginBottom: 24,
  },
  list: {
    gap: 10,
  },
  tile: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.white,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  tileSelected: {
    borderColor: colors.orange,
    backgroundColor: colors.orangeLight + '30',
  },
  tileLabel: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 15,
    color: colors.ink,
    marginBottom: 3,
  },
  tileLabelSelected: {
    color: colors.orange,
  },
  tileSub: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: colors.muted,
  },
  tileSubSelected: {
    color: colors.inkMid,
  },
  tileUnsure: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: 'transparent',
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  tileUnsureSelected: {
    borderColor: colors.orange,
    backgroundColor: colors.orangeLight + '20',
  },
  tileUnsureMargin: {
    marginTop: 6,
  },
  unsureLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: colors.muted,
  },
  unsureLabelSelected: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    color: colors.orange,
  },
});

// ─── Screen-level styles ──────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backBtn: {
    width: 40, height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    width: 20, height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowStem: {
    position: 'absolute',
    width: 16, height: 2,
    borderRadius: 1,
    backgroundColor: colors.ink,
    left: 2,
  },
  arrowHeadTop: {
    position: 'absolute',
    width: 8, height: 2,
    borderRadius: 1,
    backgroundColor: colors.ink,
    left: 2, top: 7,
    transform: [{ rotate: '-45deg' }, { translateX: 1 }],
  },
  arrowHeadBottom: {
    position: 'absolute',
    width: 8, height: 2,
    borderRadius: 1,
    backgroundColor: colors.ink,
    left: 2, bottom: 7,
    transform: [{ rotate: '45deg' }, { translateX: 1 }],
  },
  stepsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  stepDot: {
    width: 8, height: 8, borderRadius: 4,
  },
  stepDotActive:   { backgroundColor: colors.orange   },
  stepDotInactive: { backgroundColor: colors.border },
  topBarSpacer: { width: 40 },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 40,
  },
  footer: {
    paddingHorizontal: 32,
    paddingBottom: 48,
    paddingTop: 16,
  },
  continueBtn: {
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  continueBtnActive: {
    backgroundColor: colors.orange,
    shadowColor: colors.orange,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 5,
  },
  continueBtnText: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 17,
    color: colors.muted,
    letterSpacing: 0.2,
  },
  continueBtnTextActive: {
    color: colors.white,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 8,
  },
  skipText: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: colors.muted,
    letterSpacing: 0.1,
  },
});

// ─── Toggle styles ────────────────────────────────────────────
const togSt = StyleSheet.create({
  track: {
    borderRadius: 13,
    justifyContent: 'center',
  },
  thumb: {
    width: THUMB_D,
    height: THUMB_D,
    borderRadius: THUMB_D / 2,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
    elevation: 2,
  },
});

// ─── Conditions styles ────────────────────────────────────────
const condSt = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  rowLeft: {
    flex: 1,
    marginRight: 16,
    position: 'relative',
  },
  labelLine: {
    marginBottom: 4,
    paddingRight: 22,
  },
  rowLabel: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 14,
    color: colors.ink,
  },
  infoBtn: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
  infoCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoI: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 9,
    color: colors.muted,
    lineHeight: 11,
  },
  rowSub: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: colors.muted,
    lineHeight: 17,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 18,
  },
  noneBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 18,
    backgroundColor: colors.white,
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 12,
  },
  noneBoxSelected: {
    borderColor: colors.ink,
    backgroundColor: colors.ink,
  },
  noneCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noneCheckSelected: {
    borderColor: colors.white,
    backgroundColor: colors.white,
  },
  noneCheckMark: {
    fontSize: 11,
    color: colors.ink,
    fontFamily: 'SpaceGrotesk-SemiBold',
    lineHeight: 13,
  },
  noneLabel: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 14,
    color: colors.ink,
  },
  noneLabelSelected: {
    color: colors.white,
  },
});

// ─── Info sheet styles ────────────────────────────────────────
const sheetSt = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  dismiss: {
    flex: 1,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 28,
    paddingTop: 16,
    paddingBottom: 48,
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: 4,
    paddingBottom: 20,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  title: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 20,
    color: colors.ink,
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  body: {
    fontFamily: 'Inter-Regular',
    fontSize: 15,
    color: colors.muted,
    lineHeight: 24,
    marginBottom: 28,
  },
  gotItBtn: {
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  gotItText: {
    fontFamily: 'SpaceGrotesk-SemiBold',
    fontSize: 16,
    color: colors.white,
  },
});
