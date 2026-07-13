import React, { useRef, useCallback } from 'react';
import { StyleSheet, Platform } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import passportMapStyle from '../../constants/passportMapStyle';
import PassportMapPin, { MAP_PIN_ANCHOR_X, MAP_PIN_ANCHOR_Y } from './PassportMapPin';

const DOUBLE_TAP_MS = 300;

// The map layer, sized and positioned entirely by the screen (it just
// fills whatever container it's given — the preview strip or full
// screen). A single tap on the background expands it; while expanded, a
// second tap within 300ms collapses it back. `zoomTapEnabled={false}`
// frees up double-tap (native maps otherwise treat it as zoom-in) for
// that gesture. Pins get a "little card" label once expanded.
export default React.memo(function PassportMap({
  mapRef,
  initialRegion,
  clusters,
  bestKey,
  stampingKey,
  onStampDone,
  onPinPress,
  expanded,
  onExpand,
  onCollapse,
}) {
  const lastTapRef = useRef(0);

  const handleBackgroundPress = useCallback(() => {
    if (!expanded) {
      onExpand();
      return;
    }
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_MS) {
      lastTapRef.current = 0;
      onCollapse();
    } else {
      lastTapRef.current = now;
    }
  }, [expanded, onExpand, onCollapse]);

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      initialRegion={initialRegion}
      mapType={Platform.OS === 'ios' ? 'mutedStandard' : 'standard'}
      customMapStyle={passportMapStyle}
      zoomTapEnabled={false}
      showsPointsOfInterest={false}
      showsBuildings={false}
      showsTraffic={false}
      showsIndoors={false}
      showsCompass={false}
      showsMyLocationButton={false}
      toolbarEnabled={false}
      onPress={handleBackgroundPress}
    >
      {clusters.map((c) => (
        <Marker
          key={c.key}
          coordinate={{ latitude: c.lat, longitude: c.lng }}
          anchor={{ x: MAP_PIN_ANCHOR_X, y: MAP_PIN_ANCHOR_Y }}
          onPress={(e) => {
            e.stopPropagation();
            onPinPress(c);
          }}
        >
          <PassportMapPin
            cluster={c}
            count={c.sessions.length}
            hasBestSession={c.key === bestKey}
            expanded={expanded}
            stamping={stampingKey === c.key}
            onStampDone={onStampDone}
          />
        </Marker>
      ))}
    </MapView>
  );
});
