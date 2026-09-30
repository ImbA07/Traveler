import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { supabase } from '../supabase';
import { colors, fonts } from '../theme';
import { Orb } from './Orb';
import { Corners, Horizon } from './Sky';
import { Btn } from './Ui';

export function Login() {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const go = async () => {
    if (!email.trim() || !pw) {
      setMsg('Bitte E-Mail und Passwort eingeben.');
      return;
    }
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pw });
    setBusy(false);
    if (error) {
      setMsg(error.message.includes('Invalid login') ? 'E-Mail oder Passwort stimmt nicht.' : error.message);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <Horizon height={170} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.wrap} keyboardShouldPersistTaps="handled">
          <Orb size={260} pulse={busy} />
          <Text style={s.title}>TRAVELER</Text>
          <Text style={s.sub}>DEINE GEDANKEN REISEN MIT DIR</Text>
          <View style={s.card}>
            <Corners />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="E-Mail"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              keyboardType="email-address"
              style={[s.input, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
            />
            <TextInput
              value={pw}
              onChangeText={setPw}
              placeholder="Passwort"
              placeholderTextColor={colors.muted}
              secureTextEntry
              onSubmitEditing={go}
              style={[s.input, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
            />
            {!!msg && <Text style={s.msg}>{msg}</Text>}
            <Btn label={busy ? 'Einen Moment …' : 'Anmelden'} onPress={go} disabled={busy} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24, paddingBottom: 150 },
  title: { fontFamily: fonts.title, fontSize: 34, letterSpacing: 10, color: colors.cream, marginTop: 4 },
  sub: { fontFamily: fonts.light, fontSize: 12, letterSpacing: 4, color: colors.muted, marginBottom: 26, marginTop: 6 },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#0B0808E6',
    padding: 22,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 14,
  },
  input: {
    borderBottomWidth: 1,
    borderColor: colors.line,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.cream,
    paddingVertical: 8,
  },
  msg: { fontFamily: fonts.body, color: colors.danger, fontSize: 13, lineHeight: 19 },
});
