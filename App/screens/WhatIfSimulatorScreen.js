import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import { simulateSession, overridesFromActuals, compareResults } from '../services/SimulationService';
import SimulationCharts from '../components/whatIf/SimulationCharts';
import ResultStrip from '../components/whatIf/ResultStrip';
import ControlsPanel from '../components/whatIf/ControlsPanel';
import ControlsSheet from '../components/whatIf/ControlsSheet';
import WhatIfActions from '../components/whatIf/WhatIfActions';

const SCREEN_H = Dimensions.get('window').height;
// Sheet snap heights: opens at 38%, collapsible to a peek, capped at 65%
// so the top of the chart always stays visible.
const SHEET_MIN = Math.round(SCREEN_H * 0.18);
const SHEET_INIT = Math.round(SCREEN_H * 0.38);
const SHEET_MAX = Math.round(SCREEN_H * 0.65);
const STRIP_GAP = 10; // gap between the sheet's top edge and the strip

// The "What If?" counterfactual simulator. The chart fills the screen as
// the background layer; the controls live in a draggable bottom sheet on
// top of it; the result strip floats pinned just above the sheet so the
// number stays in view while a thumb is on a slider.
export default function WhatIfSimulatorScreen({ visible, onClose, session, simData }) {
  const { readings, userProfile, actuals } = simData;
  const [overrides, setOverrides] = useState(() => overridesFromActuals(actuals));

  // Lock the sheet's scroll while a knob is held so a drag can't scroll
  // the page or have its gesture stolen. setNativeProps applies the lock
  // immediately, without waiting for a React re-render.
  const scrollRef = useRef(null);
  const [scrollLocked, setScrollLocked] = useState(false);
  const handleDraggingChange = useCallback((dragging) => {
    scrollRef.current?.setNativeProps({ scrollEnabled: !dragging });
    setScrollLocked(dragging);
  }, []);

  // Sheet height drives both the sheet itself and the floating strip.
  const sheetHeight = useRef(new Animated.Value(SHEET_INIT)).current;

  // Measured strip height — the chart layer reserves exactly this much
  // space (plus the sheet) so the floating strip never covers the lines.
  const [stripH, setStripH] = useState(110);
  const onStripLayout = useCallback((e) => setStripH(Math.ceil(e.nativeEvent.layout.height)), []);

  // The actual line never changes — computed once per session through the
  // same engine path as the simulation, so Reset makes the lines identical.
  const actualResult = useMemo(
    () => simulateSession({ readings, overrides: overridesFromActuals(actuals), userProfile }),
    [readings, actuals, userProfile]
  );
  const simResult = useMemo(
    () => simulateSession({ readings, overrides, userProfile }),
    [readings, overrides, userProfile]
  );
  const comparison = useMemo(() => compareResults(actualResult, simResult), [actualResult, simResult]);

  const handleChange = useCallback((partial) => {
    setOverrides((prev) => ({ ...prev, ...partial }));
  }, []);
  const handleReset = useCallback(() => setOverrides(overridesFromActuals(actuals)), [actuals]);

  return (
    // fullScreen (not pageSheet): the iOS sheet's own drag-to-dismiss
    // gesture moved the whole page while sliders were being dragged.
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView style={st.safe}>
        {/* Background layer: header + full-screen chart. */}
        <View style={st.header}>
          <View style={st.headerText}>
            <Text style={st.title}>Session Simulator</Text>
            <Text style={st.subtitle}>{session.location}  ·  {session.date}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={st.closeBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="close" size={26} color={colors.ink} />
          </TouchableOpacity>
        </View>
        <View style={[st.chartArea, { paddingBottom: SHEET_INIT + STRIP_GAP + stripH + 10 }]}>
          <SimulationCharts
            actualResult={actualResult}
            simResult={simResult}
            startTime={session.startTime}
            endTime={session.endTime}
          />
        </View>

        {/* Floating result strip, pinned just above the sheet's top edge. */}
        <Animated.View
          style={[st.stripWrap, { bottom: Animated.add(sheetHeight, STRIP_GAP) }]}
          pointerEvents="box-none"
          onLayout={onStripLayout}
        >
          <ResultStrip comparison={comparison} />
        </Animated.View>

        {/* Draggable controls sheet. */}
        <ControlsSheet
          heightAnim={sheetHeight}
          minH={SHEET_MIN}
          initialH={SHEET_INIT}
          maxH={SHEET_MAX}
          scrollRef={scrollRef}
          scrollLocked={scrollLocked}
        >
          <ControlsPanel
            overrides={overrides}
            actuals={actuals}
            durationMinutes={actualResult.durationMinutes}
            onChange={handleChange}
            onReset={handleReset}
            onDraggingChange={handleDraggingChange}
          />
          <WhatIfActions
            session={session}
            overrides={overrides}
            actuals={actuals}
            comparison={comparison}
            actualResult={actualResult}
            simResult={simResult}
          />
        </ControlsSheet>
      </SafeAreaView>
    </Modal>
  );
}

const st = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 8,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 28,
    color: colors.ink,
    letterSpacing: -0.8,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  closeBtn: {
    marginTop: 6,
  },
  chartArea: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    // paddingBottom is set inline from the measured strip height, so the
    // whole simulated line stays visible above the floating strip.
  },
  stripWrap: {
    position: 'absolute',
    left: 20,
    right: 20,
  },
});
