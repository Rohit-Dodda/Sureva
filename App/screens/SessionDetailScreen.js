import React, { useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  Easing,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import colors from '../constants/colors';
import mockData from '../constants/mockData';
import SectionCard from '../components/SectionCard';
import DepletionChart from '../components/DepletionChart';
import ScoreHero from '../components/sessionDetail/ScoreHero';
import DriversCard from '../components/sessionDetail/DriversCard';
import SkinTodayCard from '../components/sessionDetail/SkinTodayCard';
import MomentsCard from '../components/sessionDetail/MomentsCard';
import AlertComplianceCard from '../components/sessionDetail/AlertComplianceCard';
import PatternCard from '../components/sessionDetail/PatternCard';
import PreventedCard from '../components/sessionDetail/PreventedCard';
import SurevaTakeCard from '../components/sessionDetail/SurevaTakeCard';
import SlideInView, { IOS_EASE_OUT } from '../components/SlideInView';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 80;

export default function SessionDetailScreen({ session, onBack }) {
  const translateX = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const detail = mockData.sessionDetails[session.id];

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: 0,
      duration: 460,
      easing: IOS_EASE_OUT,
      useNativeDriver: true,
    }).start();
  }, [translateX]);

  const dismiss = useCallback(() => {
    Animated.timing(translateX, {
      toValue: SCREEN_WIDTH,
      duration: 260,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(onBack);
  }, [onBack, translateX]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        dx > 8 && Math.abs(dx) > Math.abs(dy),
      onPanResponderMove: (_, { dx }) => {
        if (dx > 0) translateX.setValue(dx);
      },
      onPanResponderRelease: (_, { dx, vx }) => {
        if (dx > SWIPE_THRESHOLD || vx > 0.5) {
          dismiss();
        } else {
          Animated.timing(translateX, { toValue: 0, duration: 320, easing: IOS_EASE_OUT, useNativeDriver: true }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.timing(translateX, { toValue: 0, duration: 320, easing: IOS_EASE_OUT, useNativeDriver: true }).start();
      },
    })
  ).current;

  return (
    <Animated.View style={[st.flex, { transform: [{ translateX }] }]} {...panResponder.panHandlers}>
      <SafeAreaView style={st.safe}>
        <StatusBar style="dark" />

        <View style={st.header}>
          <TouchableOpacity onPress={onBack} style={st.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="chevron-back" size={26} color={colors.ink} />
          </TouchableOpacity>
          <Text style={st.headerTitle}>Session Details</Text>
          <View style={st.backBtn} />
        </View>

        <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
          <SlideInView delay={140}>
            <View style={st.hero}>
              <Text style={st.location}>{session.location}</Text>
              <Text style={st.envTag}>{session.environment}</Text>
              <Text style={st.dateStr}>{session.date}  ·  {session.startTime} – {session.endTime}  ·  {session.duration}</Text>
            </View>
          </SlideInView>

          {detail ? (
            <>
              <SlideInView delay={180}>
                <ScoreHero score={session.score} verdict={detail.verdict} />
              </SlideInView>

              <SlideInView delay={230}>
                <SectionCard icon="pulse-outline" title="Protection Timeline">
                  <DepletionChart
                    data={detail.timeline}
                    durationMinutes={session.durationMinutes}
                    startTime={session.startTime}
                    endTime={session.endTime}
                  />
                </SectionCard>
              </SlideInView>

              <SlideInView delay={280}><DriversCard drivers={detail.drivers} /></SlideInView>
              <SlideInView delay={330}><SkinTodayCard skin={detail.skin} /></SlideInView>
              <SlideInView delay={380}><MomentsCard moments={detail.moments} /></SlideInView>
              <SlideInView delay={430}><AlertComplianceCard alerts={detail.alerts} /></SlideInView>
              <SlideInView delay={480}><PatternCard pattern={detail.pattern} /></SlideInView>
              <SlideInView delay={530}><PreventedCard prevented={detail.prevented} /></SlideInView>
              <SlideInView delay={580}><SurevaTakeCard take={detail.aiTake} /></SlideInView>
            </>
          ) : (
            <Text style={st.empty}>Detailed breakdown isn't available for this session.</Text>
          )}
        </ScrollView>
      </SafeAreaView>
    </Animated.View>
  );
}

const st = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safe: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  backBtn: {
    width: 36,
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 17,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 48,
  },
  hero: {
    marginBottom: 20,
  },
  location: {
    fontFamily: 'SFProDisplay-Black',
    fontSize: 28,
    color: colors.ink,
    letterSpacing: -0.8,
    marginBottom: 6,
  },
  envTag: {
    fontFamily: 'SFProDisplay-Bold',
    fontSize: 12,
    color: colors.orange,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  dateStr: {
    fontFamily: 'SFProDisplay-Regular',
    fontSize: 13,
    color: colors.muted,
  },
  empty: {
    fontFamily: 'SFProDisplay-Regular',
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 40,
  },
});
