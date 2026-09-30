import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, G, Path, RadialGradient, Stop } from 'react-native-svg';

type Props = {
  size?: number;
  pulse?: boolean; // gentle pulsing (used while syncing)
  cracked?: boolean;
  style?: StyleProp<ViewStyle>;
};

// The Traveler: a pale glowing sphere with a jagged scar of light.
export function Orb({ size = 120, pulse = false, cracked = true, style }: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!pulse) {
      scale.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.12,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, scale]);

  return (
    <Animated.View style={[{ width: size, height: size, transform: [{ scale }] }, style]}>
      <Svg width={size} height={size} viewBox="0 0 200 200">
        <Defs>
          <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
            <Stop offset="0.55" stopColor="#F6F3EA" stopOpacity="0.35" />
            <Stop offset="1" stopColor="#F6F3EA" stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="body" cx="38%" cy="34%" r="75%">
            <Stop offset="0" stopColor="#FFFFFF" />
            <Stop offset="0.55" stopColor="#F1EBDA" />
            <Stop offset="1" stopColor="#C9B98A" />
          </RadialGradient>
        </Defs>
        <Circle cx="100" cy="100" r="100" fill="url(#glow)" />
        <Circle cx="100" cy="100" r="68" fill="url(#body)" />
        {cracked && (
          <G>
            <Path
              d="M 70 44 L 84 66 L 76 84 L 96 100 L 88 120 L 108 138 L 100 158"
              stroke="#8A7A52"
              strokeWidth="3"
              strokeLinejoin="round"
              fill="none"
              opacity="0.85"
            />
            <Path
              d="M 96 100 L 118 96 L 132 108 M 84 66 L 104 62 M 88 120 L 72 128"
              stroke="#8A7A52"
              strokeWidth="1.8"
              strokeLinejoin="round"
              fill="none"
              opacity="0.6"
            />
            <Path
              d="M 70 44 L 84 66 L 76 84 L 96 100 L 88 120 L 108 138 L 100 158"
              stroke="#FFF6D8"
              strokeWidth="1"
              strokeLinejoin="round"
              fill="none"
            />
          </G>
        )}
      </Svg>
    </Animated.View>
  );
}
