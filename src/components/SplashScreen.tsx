// src/components/SplashScreen.tsx
//
// An in-app splash. The native splash configured in app.json never appears on
// web, so this covers the gap and gives every platform the same first frame.

import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated } from 'react-native';
import { colors } from '@/theme/theme';

interface Props {
  /** Called once the splash has finished showing. */
  onDone: () => void;
  /** How long the logo stays fully visible, in ms. */
  duration?: number;
}

export default function SplashScreen({ onDone, duration = 1400 }: Props) {
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 7, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.timing(fade, { toValue: 0, duration: 300, useNativeDriver: true }).start(
        onDone
      );
    }, duration);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.root}>
      <Animated.Image
        source={require('../../assets/logo.png')}
        style={[styles.logo, { opacity: fade, transform: [{ scale }] }]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  logo: { width: 190, height: 190 },
});
