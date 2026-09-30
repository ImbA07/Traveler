import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../supabase';
import { colors, fonts } from '../theme';
import { Orb } from './Orb';
import { Btn } from './Ui';

export function Login() {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const go = async (create: boolean) => {
    if (!email.trim() || pw.length < 6) {
      setMsg('Bitte E-Mail und ein Passwort mit mindestens 6 Zeichen eingeben.');
      return;
    }
    setBusy(true);
    setMsg(null);
    const fn = create ? supabase.auth.signUp : supabase.auth.signInWithPassword;
    const { data, error } = await fn.call(supabase.auth, { email: email.trim(), password: pw });
    setBusy(false);
    if (error) {
      setMsg(
        error.message.includes('Invalid login')
          ? 'E-Mail oder Passwort stimmt nicht.'
          : error.message,
      );
    } else if (create && !data.session) {
      setMsg('Fast geschafft: Bitte bestätige die E-Mail, die wir dir geschickt haben, und melde dich dann an.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={s.wrap}
    >
      <Orb size={220} pulse={busy} />
      <Text style={s.title}>TRAVELER</Text>
      <Text style={s.sub}>Deine Gedanken reisen mit dir</Text>
      <View style={s.card}>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="E-Mail"
          placeholderTextColor={colors.inkSoft}
          autoCapitalize="none"
          keyboardType="email-address"
          style={s.input}
        />
        <TextInput
          value={pw}
          onChangeText={setPw}
          placeholder="Passwort"
          placeholderTextColor={colors.inkSoft}
          secureTextEntry
          onSubmitEditing={() => go(false)}
          style={s.input}
        />
        {!!msg && <Text style={s.msg}>{msg}</Text>}
        <View style={{ gap: 10 }}>
          <Btn label={busy ? 'Einen Moment …' : 'Anmelden'} onPress={() => go(false)} disabled={busy} />
          <Btn label="Neues Konto erstellen" kind="ghost" onPress={() => go(true)} disabled={busy} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: {
    fontFamily: fonts.title,
    fontSize: 38,
    letterSpacing: 8,
    color: colors.light,
    marginTop: 6,
  },
  sub: { fontFamily: fonts.hand, fontSize: 24, color: colors.goldSoft, marginBottom: 24 },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.paper,
    borderRadius: 12,
    padding: 20,
    borderWidth: 3,
    borderColor: colors.leather,
    gap: 12,
  },
  input: {
    borderBottomWidth: 1.5,
    borderColor: colors.leather,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
    paddingVertical: 8,
  },
  msg: { fontFamily: fonts.body, color: colors.danger, fontSize: 13, lineHeight: 19 },
});
