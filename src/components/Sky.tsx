import React, { useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { colors } from '../theme';

function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

// Dense little stars, faint orbit arcs and hairlines, warm black sky.
export function Sky() {
  const { width, height } = useWindowDimensions();
  const stars = useMemo(() => {
    const r = rng(7);
    return Array.from({ length: 320 }, () => ({
      x: r() * 100,
      y: r() * 100,
      r: r() < 0.06 ? 1.5 : 0.4 + r() * 0.8,
      o: 0.2 + r() * 0.7,
    }));
  }, []);
  const cx = width * 0.5;
  const cy = height * 0.46;
  const base = Math.max(width, height);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id="sky" cx="50%" cy="46%" r="75%">
            <Stop offset="0" stopColor="#1B1211" />
            <Stop offset="0.6" stopColor="#0E0909" />
            <Stop offset="1" stopColor="#070505" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#sky)" />
        <G stroke="#EDE8D3" fill="none">
          {[0.34, 0.5, 0.68, 0.9, 1.15].map((k, i) => (
            <Circle key={i} cx={cx} cy={cy} r={base * k} strokeWidth={0.6} opacity={0.07 - i * 0.008} />
          ))}
          <Circle cx={cx} cy={cy} r={base * 0.42} strokeWidth={0.6} opacity={0.08} strokeDasharray="2 8" />
          <Line x1={0} y1={height * 0.3} x2={width} y2={height * 0.72} strokeWidth={0.5} opacity={0.06} />
          <Line x1={width * 0.14} y1={0} x2={width * 0.62} y2={height} strokeWidth={0.5} opacity={0.05} />
        </G>
        <G fill="#F4F0DC">
          {stars.map((s, i) => (
            <Circle key={i} cx={`${s.x}%`} cy={`${s.y}%`} r={s.r} opacity={s.o} />
          ))}
        </G>
      </Svg>
    </View>
  );
}

// Grey grainy planet surface with dark patches, like the bottom of the intro art.
export function Horizon({ height = 150, opacity = 1 }: { height?: number; opacity?: number }) {
  const { width } = useWindowDimensions();
  const art = useMemo(() => {
    const r = rng(41);
    const patches = Array.from({ length: 11 }, () => {
      const px = r() * width;
      const py = height * (0.35 + r() * 0.6);
      const rx = 30 + r() * 110;
      const ry = 8 + r() * 26;
      const pts = Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        const j = 0.6 + r() * 0.7;
        return `${(px + Math.cos(a) * rx * j).toFixed(1)},${(py + Math.sin(a) * ry * j).toFixed(1)}`;
      });
      return `M ${pts.join(' L ')} Z`;
    });
    const grain = Array.from({ length: 380 }, () => ({
      x: r() * width,
      y: height * (0.3 + r() * 0.7),
      w: 0.6 + r() * 1.6,
      dark: r() < 0.6,
    }));
    return { patches, grain };
  }, [width, height]);
  const top = height * 0.3;
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height, opacity }} pointerEvents="none">
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#C4C1B3" />
            <Stop offset="1" stopColor="#8E8B80" />
          </LinearGradient>
        </Defs>
        <Path d={`M 0 ${top + 24} Q ${width / 2} ${-top * 0.2} ${width} ${top + 24} L ${width} ${height} L 0 ${height} Z`} fill="url(#ground)" />
        <G fill="#4B4343" opacity={0.85}>
          {art.patches.map((d, i) => (
            <Path key={i} d={d} />
          ))}
        </G>
        <G>
          {art.grain.map((g, i) => (
            <Rect key={i} x={g.x} y={g.y} width={g.w} height={g.w * 0.6} fill={g.dark ? '#5A5252' : '#DAD7C8'} opacity={0.4} />
          ))}
        </G>
      </Svg>
    </View>
  );
}

// Small L-shaped corner marks, like the frame of a star chart.
export function Corners({ size = 10, color = colors.creamDim }: { size?: number; color?: string }) {
  const c = { position: 'absolute' as const, width: size, height: size, borderColor: color };
  return (
    <>
      <View pointerEvents="none" style={[c, { top: -1, left: -1, borderTopWidth: 1, borderLeftWidth: 1 }]} />
      <View pointerEvents="none" style={[c, { top: -1, right: -1, borderTopWidth: 1, borderRightWidth: 1 }]} />
      <View pointerEvents="none" style={[c, { bottom: -1, left: -1, borderBottomWidth: 1, borderLeftWidth: 1 }]} />
      <View pointerEvents="none" style={[c, { bottom: -1, right: -1, borderBottomWidth: 1, borderRightWidth: 1 }]} />
    </>
  );
}
