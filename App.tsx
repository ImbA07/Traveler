import { Cinzel_600SemiBold } from '@expo-google-fonts/cinzel';
import { Jost_300Light, Jost_400Regular, Jost_500Medium, Jost_600SemiBold } from '@expo-google-fonts/jost';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Login } from './src/components/Login';
import { Main } from './src/components/Main';
import { Orb } from './src/components/Orb';
import { Horizon, Sky } from './src/components/Sky';
import { loadForUser, startBackgroundSync, unloadUser, useStore } from './src/store';
import { supabase } from './src/supabase';
import { colors } from './src/theme';

export default function App() {
  const [fontsLoaded] = useFonts({
    Cinzel_600SemiBold,
    Jost_300Light,
    Jost_400Regular,
    Jost_500Medium,
    Jost_600SemiBold,
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
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Sky />
      {signedIn && <Horizon height={240} opacity={0.14} />}
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 1 }}>
        {loading ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Orb size={200} pulse />
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
