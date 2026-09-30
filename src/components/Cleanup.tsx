import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FileItem } from '../store';
import { colors, fonts } from '../theme';
import { ago, daysSince, fileIcon, formatSize } from '../util';
import { Btn, ConfirmModal } from './Ui';

const FREE_LIMIT = 1024 * 1024 * 1024; // 1 GB (free Supabase plan)

const SIZES = [
  { label: 'ab 100 KB', v: 100 * 1024 },
  { label: 'ab 1 MB', v: 1024 * 1024 },
  { label: 'ab 5 MB', v: 5 * 1024 * 1024 },
];
const AGES = [
  { label: 'egal', v: 0 },
  { label: '30 Tage ungeöffnet', v: 30 },
  { label: '90 Tage ungeöffnet', v: 90 },
];

// Shows big files that were not opened for a long time, so they are easy to clean out.
export function Cleanup({ files, onDelete }: { files: FileItem[]; onDelete: (ids: string[]) => Promise<void> }) {
  const [minSize, setMinSize] = useState(SIZES[0].v);
  const [minAge, setMinAge] = useState(AGES[0].v);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [confirm, setConfirm] = useState(false);

  const used = files.reduce((a, f) => a + (f.size_bytes || 0), 0);
  const list = useMemo(
    () =>
      files
        .filter((f) => f.size_bytes >= minSize && daysSince(f.last_opened_at ?? f.created_at) >= minAge)
        .sort(
          (a, b) =>
            b.size_bytes * (1 + daysSince(b.last_opened_at ?? b.created_at)) -
            a.size_bytes * (1 + daysSince(a.last_opened_at ?? a.created_at)),
        ),
    [files, minSize, minAge],
  );
  const ids = Object.keys(picked).filter((k) => picked[k] && list.some((f) => f.id === k));
  const pickedSize = list.filter((f) => ids.includes(f.id)).reduce((a, f) => a + f.size_bytes, 0);

  return (
    <View style={{ flex: 1 }}>
      <Text style={s.hint}>
        Hier stehen Dateien, die viel Platz brauchen und selten geöffnet werden – die größten und ältesten zuerst.
      </Text>
      <View style={s.bar}>
        <View style={[s.barFill, { width: `${Math.min(100, (used / FREE_LIMIT) * 100)}%` }]} />
      </View>
      <Text style={s.barText}>
        {formatSize(used)} von 1 GB belegt ({files.length} Dateien)
      </Text>
      <View style={s.chips}>
        {SIZES.map((x) => (
          <Chip key={x.label} label={x.label} on={minSize === x.v} onPress={() => setMinSize(x.v)} />
        ))}
      </View>
      <View style={s.chips}>
        {AGES.map((x) => (
          <Chip key={x.label} label={x.label} on={minAge === x.v} onPress={() => setMinAge(x.v)} />
        ))}
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 90 }}>
        {list.length === 0 && <Text style={s.empty}>Nichts zum Aufräumen gefunden. 🎉</Text>}
        {list.map((f) => (
          <Pressable key={f.id} onPress={() => setPicked((p) => ({ ...p, [f.id]: !p[f.id] }))} style={s.row}>
            <View style={[s.box, picked[f.id] && s.boxOn]}>{picked[f.id] && <Text style={s.tick}>✓</Text>}</View>
            <Text style={{ fontSize: 22 }}>{fileIcon(f.mime_type, f.name)}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.name} numberOfLines={1}>
                {f.name}
              </Text>
              <Text style={s.meta}>
                {formatSize(f.size_bytes)} · zuletzt geöffnet {ago(f.last_opened_at ?? f.created_at)}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
      {ids.length > 0 && (
        <View style={s.footer}>
          <Btn label={`${ids.length} löschen (${formatSize(pickedSize)} frei)`} kind="danger" onPress={() => setConfirm(true)} />
        </View>
      )}
      {confirm && (
        <ConfirmModal
          title={`${ids.length} Datei(en) löschen?`}
          text={`Das macht ${formatSize(pickedSize)} frei. Die Dateien werden auf allen Geräten entfernt.`}
          onClose={() => setConfirm(false)}
          onConfirm={async () => {
            setConfirm(false);
            await onDelete(ids);
            setPicked({});
          }}
        />
      )}
    </View>
  );
}

function Chip({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, on && s.chipOn]}>
      <Text style={[s.chipText, on && { color: colors.light }]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  hint: { fontFamily: fonts.body, color: colors.inkSoft, fontSize: 13, lineHeight: 19, marginBottom: 10 },
  bar: { height: 10, borderRadius: 5, backgroundColor: colors.paperDark, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.gold },
  barText: { fontFamily: fonts.body, fontSize: 12, color: colors.inkSoft, marginTop: 4, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { borderWidth: 1, borderColor: colors.leather, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 5 },
  chipOn: { backgroundColor: colors.leather },
  chipText: { fontFamily: fonts.body, fontSize: 12, color: colors.leather },
  empty: { fontFamily: fonts.hand, fontSize: 24, color: colors.inkSoft, textAlign: 'center', marginTop: 40 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderBottomWidth: 1,
    borderColor: colors.line,
  },
  box: { width: 22, height: 22, borderWidth: 1.5, borderColor: colors.leather, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  boxOn: { backgroundColor: colors.leather },
  tick: { color: colors.gold, fontSize: 14, fontWeight: '700' },
  name: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
  meta: { fontFamily: fonts.body, fontSize: 12, color: colors.inkSoft, marginTop: 2 },
  footer: { position: 'absolute', bottom: 14, left: 16, right: 16, alignItems: 'center' },
});
