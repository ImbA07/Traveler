import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Platform, StyleProp, View, ViewStyle } from 'react-native';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  Line,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { ORB, RING_POINTS, RUIN_PATHS, SCRATCHES, dust, ringLines, speckles } from '../orbArt';

type Props = {
  size?: number;
  pulse?: boolean; // faster ring + breathing while syncing
  rings?: boolean; // thin star-map ring around the sphere
  style?: StyleProp<ViewStyle>;
};

const native = Platform.OS !== 'web';

// The Traveler: pale sphere, ruined skyline along the rim, star-map ring.
export function Orb({ size = 120, pulse = false, rings = true, style }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const spin = useRef(new Animated.Value(0)).current;

  const specks = useMemo(speckles, []);
  const motes = useMemo(dust, []);
  const lines = useMemo(ringLines, []);

  useEffect(() => {
    if (!rings) return;
    spin.setValue(0);
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: pulse ? 14000 : 120000,
        easing: Easing.linear,
        useNativeDriver: native,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, rings, spin]);

  useEffect(() => {
    if (!pulse) {
      scale.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.06, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: native }),
        Animated.timing(scale, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: native }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, scale]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const { cx, cy, r } = ORB;

  return (
    <Animated.View style={[{ width: size, height: size, transform: [{ scale }] }, style]}>
      {rings && (
        <Animated.View style={{ position: 'absolute', width: size, height: size, transform: [{ rotate }] }}>
          <Svg width={size} height={size} viewBox="0 0 300 300">
            <G stroke="#EDE8D3" fill="none">
              <Circle cx={cx} cy={cy} r={124} strokeWidth={0.7} opacity={0.5} />
              <Circle cx={cx} cy={cy} r={116} strokeWidth={0.5} opacity={0.35} />
              <Circle cx={cx} cy={cy} r={142} strokeWidth={0.5} opacity={0.25} strokeDasharray="1 5" />
              {lines.map((l, i) => (
                <Line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} strokeWidth={0.5} opacity={0.45} />
              ))}
            </G>
            {RING_POINTS.map((p, i) => (
              <Circle key={i} cx={p.x} cy={p.y} r={1.8} fill="#EDE8D3" opacity={0.75} />
            ))}
          </Svg>
        </Animated.View>
      )}
      <View style={{ position: 'absolute', width: size, height: size }} pointerEvents="none">
        <Svg width={size} height={size} viewBox="0 0 300 300">
          <Defs>
            <ClipPath id="orbClip">
              <Circle cx={cx} cy={cy} r={r} />
            </ClipPath>
            <RadialGradient id="halo" cx="50%" cy="50%" r="50%">
              <Stop offset="0.6" stopColor="#F4F0DC" stopOpacity="0.22" />
              <Stop offset="1" stopColor="#F4F0DC" stopOpacity="0" />
            </RadialGradient>
            <LinearGradient id="shade" x1="0.72" y1="0" x2="0.3" y2="1">
              <Stop offset="0" stopColor="#FBF9EE" />
              <Stop offset="0.32" stopColor="#ECEADD" />
              <Stop offset="0.58" stopColor="#B7BDBB" />
              <Stop offset="0.82" stopColor="#7C8482" />
              <Stop offset="1" stopColor="#4D5150" />
            </LinearGradient>
            <LinearGradient id="rimWarm" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0.7" stopColor="#D9B36A" stopOpacity="0" />
              <Stop offset="1" stopColor="#D9B36A" stopOpacity="0.5" />
            </LinearGradient>
            <RadialGradient id="under" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#E8C98C" stopOpacity="0.55" />
              <Stop offset="1" stopColor="#E8C98C" stopOpacity="0" />
            </RadialGradient>
          </Defs>

          {/* soft halo and warm light beneath the sphere */}
          <Circle cx={cx} cy={cy} r={148} fill="url(#halo)" />
          <Ellipse cx={cx} cy={cy + r + 2} rx={92} ry={12} fill="url(#under)" />

          <G clipPath="url(#orbClip)">
            <Circle cx={cx} cy={cy} r={r} fill="url(#shade)" />
            {/* flat terminator band, like the flat patches in the intro art */}
            <Path d="M 40 150 Q 110 118 170 140 Q 214 156 262 132 L 262 84 L 40 84 Z" fill="#FFFFFF" opacity={0.1} />
            <Rect x={0} y={0} width={300} height={300} fill="url(#rimWarm)" />
            {/* scratches */}
            <G stroke="#5C6263" fill="none" strokeWidth={0.6} opacity={0.5}>
              {SCRATCHES.map((d, i) => (
                <Path key={i} d={d} />
              ))}
            </G>
            {/* speckles */}
            <G fill="#171212" opacity={0.85}>
              {specks.map((p, i) => (
                <Rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} rotation={p.rot} origin={`${p.x}, ${p.y}`} />
              ))}
            </G>
            {/* ruins */}
            <G fill="#0E0B0B">
              {RUIN_PATHS.map((d, i) => (
                <Path key={i} d={d} />
              ))}
            </G>
            {/* light dust on the ruins */}
            <G fill="#EDE8D3" opacity={0.35}>
              <Rect x={146} y={236} width={2} height={1} />
              <Rect x={186} y={232} width={3} height={1} />
              <Rect x={126} y={240} width={2} height={1} />
              <Rect x={210} y={238} width={2} height={1} />
            </G>
          </G>
          {/* drifting dust top right */}
          <G fill="#F4F0DC">
            {motes.map((m, i) => (
              <Circle key={i} cx={m.x} cy={m.y} r={m.r} opacity={m.o} />
            ))}
          </G>
        </Svg>
      </View>
    </Animated.View>
  );
}
