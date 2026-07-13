import React from 'react';
import { View, StyleSheet } from 'react-native';
import colors from '../../constants/colors';

// Three-step progress: current dot orange, completed gray, upcoming empty.
export default React.memo(function CheckInProgressDots({ step, total = 3 }) {
  return (
    <View style={st.row}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            st.dot,
            i === step && st.dotCurrent,
            i < step && st.dotDone,
          ]}
        />
      ))}
    </View>
  );
});

const st = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: 'transparent',
  },
  dotCurrent: {
    backgroundColor: colors.orange,
    borderColor: colors.orange,
  },
  dotDone: {
    backgroundColor: colors.muted,
    borderColor: colors.muted,
  },
});
