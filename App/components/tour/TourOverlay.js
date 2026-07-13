import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';
import { useAppTour } from '../../context/AppTourContext';
import { useHideTabBar } from '../../context/TabBarVisibilityContext';
import { useTabSwipeLock } from '../../context/SwipeNavContext';
import TourTooltip from './TourTooltip';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const HOLE_PAD = 8;      // small margin so the cutout hugs the element with a little room
const MAX_RADIUS = 28;   // corner-radius cap for the cutout
const TOOLTIP_MARGIN = 20;
const GAP = 16;
const FADE_OUT_MS = 190;
const FADE_IN_MS = 300;
const SCRIM = '#0A0907';
// The whole screen dims; the spotlighted element is simply the one region
// the scrim doesn't cover, so it stays at full brightness against the dark.
const SCRIM_ALPHA = { spot: 0.58, page: 0.16, center: 0.42 };
const EASE_OUT = Easing.out(Easing.quad);
const EASE_IN = Easing.in(Easing.quad);

// Returns null (instead of a broken box) for a target that's off-screen
// or clipped to nothing — e.g. still scrolled out of view when measured.
function clampBox(rect) {
  const rawTop = rect.y;
  const rawBottom = rect.y + rect.height;
  const rawLeft = rect.x;
  const rawRight = rect.x + rect.width;
  if (rawBottom <= 0 || rawTop >= SCREEN_H || rawRight <= 0 || rawLeft >= SCREEN_W) return null;
  const top = Math.max(0, rawTop);
  const left = Math.max(0, rawLeft);
  const right = Math.min(SCREEN_W, rawRight);
  const bottom = Math.min(SCREEN_H, rawBottom);
  if (right - left < 4 || bottom - top < 4) return null;
  return { top, left, width: right - left, height: bottom - top };
}

// A clean-cutout tour. The whole screen is covered by one dark scrim with
// a single rounded-rect hole punched exactly at the targeted element, so
// the element itself shows through at full brightness while everything
// around it is dimmed — no glow, no shape, just the element standing out of
// the dark. Steps don't glide past each other: the overlay cross-fades —
// fades out, silently repositions, fades back in — so nothing visibly
// shifts. The welcome tour also drives the tabs so it can walk the user
// through each page. Look-don't-touch: nothing underneath is tappable while
// a tour is active.
export default function TourOverlay() {
  const { activeTour, stepIndex, getTargetRef, nextStep, skipTour, navigateToTab } = useAppTour();
  const [visible, setVisible] = useState(false);
  const [view, setView] = useState(null); // resolved, currently-displayed step visuals
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const firstStepRef = useRef(true);
  const lastTabRef = useRef('home');

  useHideTabBar(visible);
  useTabSwipeLock(visible);

  const stepCount = activeTour?.steps.length ?? 0;

  useEffect(() => {
    if (!activeTour) return;
    setVisible(true);
    overlayOpacity.setValue(0);
    firstStepRef.current = true;
    lastTabRef.current = 'home';
  }, [activeTour, overlayOpacity]);

  useEffect(() => {
    if (!activeTour) return undefined;
    let cancelled = false;
    const steps = activeTour.steps;
    const s = steps[stepIndex];
    const first = firstStepRef.current;
    firstStepRef.current = false;

    const tabSwitching = !!s.tab && s.tab !== lastTabRef.current;
    if (s.tab) { lastTabRef.current = s.tab; navigateToTab?.(s.tab); }
    const settle = tabSwitching ? 540 : (s.target ? 360 : 200);

    const buildView = (box) => {
      const mode = box ? 'spot' : (s.tab && s.tab !== 'home' ? 'page' : 'center');
      let spotlight = null;
      let tooltip;
      let pointerSide = null;
      let pointerLeft = null;

      if (mode === 'spot') {
        const hole = {
          left: box.left - HOLE_PAD,
          top: box.top - HOLE_PAD,
          width: box.width + HOLE_PAD * 2,
          height: box.height + HOLE_PAD * 2,
          radius: Math.min(MAX_RADIUS, box.height / 2 + HOLE_PAD),
        };
        spotlight = hole;
        const cx = box.left + box.width / 2;
        const cy = box.top + box.height / 2;
        const halfH = box.height / 2 + HOLE_PAD;
        const below = cy < SCREEN_H / 2;
        pointerSide = below ? 'top' : 'bottom';
        pointerLeft = Math.max(24, Math.min(SCREEN_W - TOOLTIP_MARGIN * 2 - 24, cx - TOOLTIP_MARGIN - 10));
        tooltip = below
          ? { top: cy + halfH + GAP, left: TOOLTIP_MARGIN, right: TOOLTIP_MARGIN }
          : { bottom: SCREEN_H - (cy - halfH) + GAP, left: TOOLTIP_MARGIN, right: TOOLTIP_MARGIN };
      } else if (mode === 'page') {
        tooltip = { bottom: 64, left: TOOLTIP_MARGIN, right: TOOLTIP_MARGIN };
      } else {
        tooltip = { top: 0, bottom: 0, left: TOOLTIP_MARGIN, right: TOOLTIP_MARGIN, justifyContent: 'center' };
      }

      return {
        mode, scrim: SCRIM_ALPHA[mode], spotlight, tooltip, pointerSide, pointerLeft,
        text: s.text, stepIndex, stepCount: steps.length,
      };
    };

    const reveal = () => {
      if (cancelled) return;
      const done = (box) => {
        if (cancelled) return;
        setView(buildView(box));
        requestAnimationFrame(() => {
          if (!cancelled) {
            Animated.timing(overlayOpacity, {
              toValue: 1, duration: FADE_IN_MS, easing: EASE_OUT, useNativeDriver: true,
            }).start();
          }
        });
      };
      if (!s.target) { done(null); return; }
      const node = getTargetRef(s.target)?.current;
      if (!node?.measureInWindow) { done(null); return; }
      node.measureInWindow((x, y, w, h) => {
        if (cancelled) return;
        done(w && h ? clampBox({ x, y, width: w, height: h }) : null);
      });
    };

    if (first) {
      const id = setTimeout(reveal, settle);
      return () => { cancelled = true; clearTimeout(id); };
    }
    Animated.timing(overlayOpacity, {
      toValue: 0, duration: FADE_OUT_MS, easing: EASE_IN, useNativeDriver: true,
    }).start();
    const id = setTimeout(reveal, Math.max(settle, FADE_OUT_MS + 30));
    return () => { cancelled = true; clearTimeout(id); };
  }, [activeTour, stepIndex, getTargetRef, navigateToTab, overlayOpacity]);

  const handleSkip = () => {
    Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setVisible(false);
      skipTour();
    });
  };

  const handleNext = () => {
    if (stepIndex + 1 >= stepCount) {
      Animated.timing(overlayOpacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => {
        setVisible(false);
        nextStep();
      });
    } else {
      nextStep();
    }
  };

  if (!visible || !activeTour) return null;

  const sp = view?.spotlight;

  return (
    <Animated.View
      style={[st.root, { opacity: overlayOpacity }]}
      onStartShouldSetResponder={() => true}
    >
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg width={SCREEN_W} height={SCREEN_H}>
          <Defs>
            <Mask id="tourHole">
              <Rect x="0" y="0" width={SCREEN_W} height={SCREEN_H} fill="#fff" />
              {sp && (
                <Rect
                  x={sp.left}
                  y={sp.top}
                  width={sp.width}
                  height={sp.height}
                  rx={sp.radius}
                  ry={sp.radius}
                  fill="#000"
                />
              )}
            </Mask>
          </Defs>
          <Rect
            x="0"
            y="0"
            width={SCREEN_W}
            height={SCREEN_H}
            fill={SCRIM}
            fillOpacity={view?.scrim ?? 0.4}
            mask="url(#tourHole)"
          />
        </Svg>
      </View>

      {view && (
        <View style={[st.tooltipWrap, view.tooltip]} pointerEvents="box-none">
          <TourTooltip
            text={view.text}
            stepIndex={view.stepIndex}
            stepCount={view.stepCount}
            onNext={handleNext}
            onSkip={handleSkip}
            pointerSide={view.pointerSide}
            pointerLeft={view.pointerLeft}
          />
        </View>
      )}
    </Animated.View>
  );
}

const st = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 200,
  },
  tooltipWrap: {
    position: 'absolute',
  },
});
