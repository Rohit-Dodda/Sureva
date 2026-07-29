import React, { useCallback } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import colors from '../../constants/colors';
import StampChip, { CHIP_W } from './StampChip';

const GAP = 9;

// One axis of the Atlas — Place, Latitude, Altitude, or Season.
//
// FlatList rather than ScrollView per the project's list rule: the Place row
// is open-ended and will pass ten entries for anyone who travels, and the
// three fixed rows share the component so all four behave identically.
function AtlasRow({ row, onSelectStamp }) {
  const filled = row.slots.filter((s) => s.stamp).length;

  const renderItem = useCallback(
    ({ item }) => <StampChip slot={item} onPress={onSelectStamp} />,
    [onSelectStamp]
  );
  const keyExtractor = useCallback((item) => item.slot, []);

  return (
    <View style={st.wrap}>
      <View style={st.head}>
        <Text style={st.label}>{row.label}</Text>
        <Text style={st.count}>{filled}/{row.slots.length}</Text>
      </View>

      <FlatList
        data={row.slots}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={st.list}
        ItemSeparatorComponent={Separator}
        // Chips are a fixed width, so the list can skip measuring them.
        getItemLayout={(_, index) => ({
          length: CHIP_W + GAP,
          offset: (CHIP_W + GAP) * index,
          index,
        })}
      />
    </View>
  );
}

const Separator = () => <View style={{ width: GAP }} />;

const st = StyleSheet.create({
  wrap: {
    marginBottom: 22,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 9,
  },
  label: {
    fontFamily: 'Switzer-Semibold',
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  count: {
    fontFamily: 'Switzer-Bold',
    fontSize: 13,
    color: colors.muted,
    fontVariant: ['tabular-nums'],
  },
  list: {
    paddingHorizontal: 20,
  },
});

export default React.memo(AtlasRow);
