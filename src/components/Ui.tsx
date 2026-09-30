import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors, fonts } from '../theme';

export function Btn({
  label,
  onPress,
  kind = 'primary',
  disabled,
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.btn,
        kind === 'primary' && s.btnPrimary,
        kind === 'ghost' && s.btnGhost,
        kind === 'danger' && s.btnDanger,
        (pressed || disabled) && { opacity: 0.6 },
      ]}
    >
      <Text
        style={[
          s.btnText,
          kind === 'ghost' && { color: colors.leather },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Sheet({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={s.sheet} onPress={() => {}}>
          <Text style={s.sheetTitle}>{title}</Text>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function PromptModal({
  title,
  initial = '',
  confirmLabel = 'OK',
  onSubmit,
  onClose,
}: {
  title: string;
  initial?: string;
  confirmLabel?: string;
  onSubmit: (v: string) => void;
  onClose: () => void;
}) {
  const [v, setV] = useState(initial);
  useEffect(() => setV(initial), [initial]);
  return (
    <Sheet title={title} onClose={onClose}>
      <TextInput
        autoFocus
        value={v}
        onChangeText={setV}
        onSubmitEditing={() => v.trim() && onSubmit(v.trim())}
        style={s.input}
        placeholderTextColor={colors.inkSoft}
      />
      <View style={s.row}>
        <Btn label="Abbrechen" kind="ghost" onPress={onClose} />
        <Btn label={confirmLabel} onPress={() => v.trim() && onSubmit(v.trim())} />
      </View>
    </Sheet>
  );
}

export function ConfirmModal({
  title,
  text,
  confirmLabel = 'Löschen',
  onConfirm,
  onClose,
}: {
  title: string;
  text?: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet title={title} onClose={onClose}>
      {!!text && <Text style={s.text}>{text}</Text>}
      <View style={s.row}>
        <Btn label="Abbrechen" kind="ghost" onPress={onClose} />
        <Btn label={confirmLabel} kind="danger" onPress={onConfirm} />
      </View>
    </Sheet>
  );
}

export type MenuItem = { label: string; onPress: () => void; danger?: boolean };
export function MenuModal({ title, items, onClose }: { title: string; items: MenuItem[]; onClose: () => void }) {
  return (
    <Sheet title={title} onClose={onClose}>
      {items.map((it) => (
        <Pressable
          key={it.label}
          onPress={() => {
            onClose();
            it.onPress();
          }}
          style={s.menuItem}
        >
          <Text style={[s.menuText, it.danger && { color: colors.danger }]}>{it.label}</Text>
        </Pressable>
      ))}
    </Sheet>
  );
}

export function PickerModal({
  title,
  options,
  onPick,
  onClose,
}: {
  title: string;
  options: { key: string | null; label: string }[];
  onPick: (k: string | null) => void;
  onClose: () => void;
}) {
  return (
    <Sheet title={title} onClose={onClose}>
      <ScrollView style={{ maxHeight: 320 }}>
        {options.map((o) => (
          <Pressable
            key={String(o.key)}
            onPress={() => {
              onClose();
              onPick(o.key);
            }}
            style={s.menuItem}
          >
            <Text style={s.menuText}>{o.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </Sheet>
  );
}

const s = StyleSheet.create({
  btn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: { backgroundColor: colors.leather },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.leather },
  btnDanger: { backgroundColor: colors.danger },
  btnText: { color: colors.light, fontFamily: fonts.bodyBold, fontSize: 14 },
  backdrop: {
    flex: 1,
    backgroundColor: '#000000AA',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.paper,
    borderRadius: 12,
    padding: 18,
    borderWidth: 2,
    borderColor: colors.gold,
  },
  sheetTitle: { fontFamily: fonts.title, fontSize: 18, color: colors.leather, marginBottom: 12 },
  input: {
    borderBottomWidth: 1.5,
    borderColor: colors.leather,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
    paddingVertical: 6,
    marginBottom: 16,
  },
  row: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  text: { fontFamily: fonts.body, color: colors.ink, marginBottom: 16, lineHeight: 22 },
  menuItem: { paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.line },
  menuText: { fontFamily: fonts.body, fontSize: 16, color: colors.ink },
});
