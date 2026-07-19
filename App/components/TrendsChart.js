import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../constants/colors';

const CHART_H = 140;

const Bar = React.memo(function Bar({ value, maxValue, index, selected, future }) {
  const grow = useRef(new Animated.Value(3)).current;
  const target = future || value === 0
    ? 3
    : Math.max(6, Math.round((value / maxValue) * CHART_H));

  useEffect(() => {
    Animated.timing(grow, {
      toValue: target,
      duration: 520,
      delay: index * 22,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      useNativeDriver: false,
    }).start();
  }, [target, index]);

  if (selected) {
    return (
      <Animated.View style={[st.barClip, { height: grow }]}>
        <LinearGradient
          colors={[colors.gradOrangeStart, colors.gradOrangeEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    );
  }
  return (
    <Animated.View
      style={[st.bar, {
        height: grow,
        backgroundColor: future ? colors.surface : value === 0 ? colors.surface : colors.orangeWashDark,
      }]}
    />
  );
});

// Tappable animated bar chart. data: [{ label, value }] — value null = future
// period. Key the component by dataset id so bars re-grow on dataset change.
export default React.memo(function TrendsChart({ data, selectedIndex, onSelectBar, labelEvery = 1 }) {
  const maxValue = Math.max(...data.map((d) => d.value ?? 0), 0.1);
  const selected = selectedIndex != null ? data[selectedIndex] : null;

  return (
    <View>
      {/* Floating value bubble for the selected bar */}
      <View style={st.bubbleRow}>
        {selected && selected.value != null ? (
          <View style={st.bubble}>
            <Text style={st.bubbleText}>{selected.value.toFixed(selected.value >= 10 ? 0 : 1)} MEDs</Text>
          </View>
        ) : (
          <Text style={st.bubbleHint}>Tap a bar to inspect</Text>
        )}
      </View>

      <View style={st.chartRow}>
        {data.map((d, i) => (
          <Pressable
            key={i}
            style={st.col}
            onPress={() => onSelectBar(selectedIndex === i ? null : i)}
            disabled={d.value == null}
          >
            <View style={st.barWrap}>
              <Bar
                value={d.value ?? 0}
                maxValue={maxValue}
                index={i}
                selected={selectedIndex === i}
                future={d.value == null}
              />
            </View>
            <Text style={[st.label, selectedIndex === i && st.labelSelected]} numberOfLines={1}>
              {i % labelEvery === 0 ? d.label : ''}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
});

const st = StyleSheet.create({
  bubbleRow: {
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  bubble: {
    backgroundColor: colors.charcoal,
    borderRadius: 13,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  bubbleText: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: colors.onDark,
    letterSpacing: 0.2,
  },
  bubbleHint: {
    fontFamily: 'Outfit-Regular',
    fontSize: 12,
    color: colors.muted,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  col: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  barWrap: {
    height: CHART_H,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '58%',
    maxWidth: 18,
    borderRadius: 5,
  },
  barClip: {
    width: '58%',
    maxWidth: 18,
    borderRadius: 5,
    overflow: 'hidden',
  },
  label: {
    fontFamily: 'Outfit-Regular',
    fontSize: 9.5,
    color: colors.muted,
  },
  labelSelected: {
    fontFamily: 'Outfit-Regular',
    color: colors.ink,
  },
});
