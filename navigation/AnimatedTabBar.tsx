import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';

import { colors } from '../theme';
import type { MainTabParamList } from './types';

type TabRouteName = keyof MainTabParamList;

type TabVisual = {
  accent: string;
  label: string;
  sprite: ImageSourcePropType;
};

const TAB_VISUALS: Record<TabRouteName, TabVisual> = {
  HomeTab: {
    accent: '#B86BFF',
    label: 'Home',
    sprite: require('../assets/sprites/tabs/tab-home.png'),
  },
  SkillsTab: {
    accent: '#5CD9FF',
    label: 'Skills',
    sprite: require('../assets/sprites/tabs/tab-skills.png'),
  },
  RaidTab: {
    accent: '#FF765F',
    label: 'Raid',
    sprite: require('../assets/sprites/tabs/tab-raid.png'),
  },
  FriendsTab: {
    accent: '#7B9DFF',
    label: 'Friends',
    sprite: require('../assets/sprites/tabs/tab-friends.png'),
  },
  ProfileTab: {
    accent: '#DCA6FF',
    label: 'Profile',
    sprite: require('../assets/sprites/tabs/tab-profile.png'),
  },
};

type AnimatedTabButtonProps = {
  accessibilityLabel?: string;
  isFocused: boolean;
  onLongPress: () => void;
  onPress: () => void;
  reduceMotion: boolean;
  testID?: string;
  visual: TabVisual;
};

function AnimatedTabButton({
  accessibilityLabel,
  isFocused,
  onLongPress,
  onPress,
  reduceMotion,
  testID,
  visual,
}: AnimatedTabButtonProps) {
  const focusProgress = useRef(new Animated.Value(isFocused ? 1 : 0)).current;
  const hoverProgress = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.spring(focusProgress, {
      toValue: isFocused ? 1 : 0,
      damping: 15,
      stiffness: 190,
      mass: 0.8,
      useNativeDriver: true,
    });

    animation.start();
    return () => animation.stop();
  }, [focusProgress, isFocused]);

  useEffect(() => {
    hoverProgress.stopAnimation();
    hoverProgress.setValue(0);

    if (!isFocused || reduceMotion) {
      return;
    }

    const hoverLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(hoverProgress, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(hoverProgress, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );

    hoverLoop.start();
    return () => hoverLoop.stop();
  }, [hoverProgress, isFocused, reduceMotion]);

  const animatePress = (toValue: number) => {
    Animated.spring(pressScale, {
      toValue,
      damping: 14,
      stiffness: 320,
      mass: 0.55,
      useNativeDriver: true,
    }).start();
  };

  const selectedLift = focusProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -7],
  });
  const hoverLift = hoverProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -2.5],
  });
  const selectedScale = focusProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.82, 1.08],
  });
  const spriteOpacity = focusProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.48, 1],
  });
  const auraOpacity = focusProgress.interpolate({
    inputRange: [0, 0.75, 1],
    outputRange: [0, 0.12, 0.26],
  });
  const auraScale = focusProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });
  const labelOpacity = focusProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.56, 1],
  });

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? visual.label}
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      onLongPress={onLongPress}
      onPress={onPress}
      onPressIn={() => animatePress(0.9)}
      onPressOut={() => animatePress(1)}
      style={styles.tabButton}
      testID={testID}
    >
      <Animated.View
        style={[
          styles.tabContent,
          {
            transform: [
              { translateY: Animated.add(selectedLift, hoverLift) },
              { scale: Animated.multiply(selectedScale, pressScale) },
            ],
          },
        ]}
      >
        <View style={styles.spriteStage}>
          <Animated.View
            style={[
              styles.aura,
              {
                backgroundColor: visual.accent,
                opacity: auraOpacity,
                transform: [{ scale: auraScale }],
              },
            ]}
          />
          <Animated.View style={{ opacity: spriteOpacity }}>
            <Image resizeMode="contain" source={visual.sprite} style={styles.sprite} />
          </Animated.View>
        </View>

        <Animated.View style={[styles.labelRow, { opacity: labelOpacity }]}>
          <Text style={[styles.label, isFocused && { color: visual.accent }]}>
            {visual.label}
          </Text>
          <Animated.View
            style={[
              styles.activePip,
              {
                backgroundColor: visual.accent,
                opacity: focusProgress,
                transform: [{ scaleX: focusProgress }],
              },
            ]}
          />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

export default function AnimatedTabBar({
  state,
  descriptors,
  navigation,
  insets,
}: BottomTabBarProps) {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) {
        setReduceMotion(enabled);
      }
    });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return (
    <View
      style={[
        styles.safeArea,
        { paddingBottom: Math.max(insets.bottom, 8) },
      ]}
    >
      <View style={styles.bar}>
        <View pointerEvents="none" style={styles.topHighlight} />
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const options = descriptors[route.key].options;
          const visual = TAB_VISUALS[route.name as TabRouteName];

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              void Haptics.selectionAsync();
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
            <AnimatedTabButton
              accessibilityLabel={options.tabBarAccessibilityLabel}
              isFocused={isFocused}
              key={route.key}
              onLongPress={onLongPress}
              onPress={onPress}
              reduceMotion={reduceMotion}
              testID={options.tabBarButtonTestID}
              visual={visual}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingTop: 7,
  },
  bar: {
    alignItems: 'center',
    backgroundColor: '#121522',
    borderColor: '#30364A',
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: 'row',
    height: 72,
    paddingHorizontal: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 14,
  },
  topHighlight: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    height: 1,
    left: 22,
    position: 'absolute',
    right: 22,
    top: 0,
  },
  tabButton: {
    alignItems: 'center',
    flex: 1,
    height: 72,
    justifyContent: 'center',
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  spriteStage: {
    alignItems: 'center',
    height: 43,
    justifyContent: 'center',
    width: 49,
  },
  aura: {
    borderRadius: 22,
    height: 42,
    position: 'absolute',
    shadowColor: colors.primaryLight,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 12,
    width: 42,
  },
  sprite: {
    height: 43,
    width: 49,
  },
  labelRow: {
    alignItems: 'center',
    height: 18,
  },
  label: {
    color: '#747C91',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.15,
  },
  activePip: {
    borderRadius: 999,
    height: 2,
    marginTop: 2,
    width: 14,
  },
});
