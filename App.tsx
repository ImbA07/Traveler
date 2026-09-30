import { Caveat_500Medium } from '@expo-google-fonts/caveat';
import { Cinzel_600SemiBold } from '@expo-google-fonts/cinzel';
import { Lora_400Regular, Lora_700Bold } from '@expo-google-fonts/lora';
import { useFonts } from 'expo-font';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Login } from './src/components/Login';
import { Main } from './src/components/Main';
import { Orb } from './src/components/Orb';
import { loadForUser, startBackgroundSync, unloadUser, useStore } from './src/store';
import { supabase } from './src/supabase';
import { colors } from './src/theme';

function Stars() {
  const stars = useMemo(() => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    return Array.from({ length: 70 }, () => ({
      left: `${rnd() * 100}%` as const,
      top: `${rnd() * 100}%` as const,
      size: 1 + rnd() * 2,
      op: 0.25 + rnd() * 0.6,
    }));
  }, []);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {stars.map((s, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            borderRadius: 2,
            backgroundColor: colors.light,
            opacity: s.op,
          }}
        />
      ))}
    </View>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Cinzel_600SemiBold,
    Lora_400Regular,
    Lora_700Bold,
    Caveat_500Medium,
  });
  const [authReady, setAuthReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const st = useStore();

  useEffect(() => {
    startBackgroundSync();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSignedIn(true);
        loadForUser(data.session.user.id);
      }
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) {
        setSignedIn(true);
        if (st.userId !== session.user.id) loadForUser(session.user.id);
      } else {
        setSignedIn(false);
        unloadUser();
      }
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loading = !fontsLoaded || !authReady || (signedIn && !st.ready);

  return (
    <SafeAreaProvider>
    <View style={{ flex: 1, backgroundColor: colors.night }}>
      <LinearGradient colors={[colors.nightSoft, colors.night]} style={StyleSheet.absoluteFill} />
      <Stars />
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }}>
        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Orb size={140} pulse />
          </View>
        ) : signedIn ? (
          <Main />
        ) : (
          <Login />
        )}
      </SafeAreaView>
    </View>
    </SafeAreaProvider>
  );
}
