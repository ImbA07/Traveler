import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors, fonts } from '../theme';

// A note body is plain text, one line per row:
//   "# Heading", "- bullet", "- [ ] todo", "- [x] done", or normal text.
type Kind = 'text' | 'h' | 'bullet' | 'todo';
type Line = { id: number; kind: Kind; done: boolean; text: string };

let counter = 1;
const mk = (kind: Kind = 'text', text = '', done = false): Line => ({
  id: counter++,
  kind,
  done,
  text,
});

export function parseBody(body: string): Line[] {
  if (!body) return [mk()];
  return body.split('\n').map((raw) => {
    let m;
    if ((m = raw.match(/^- \[( |x|X)\] ?(.*)$/))) return mk('todo', m[2], m[1] !== ' ');
    if ((m = raw.match(/^# (.*)$/))) return mk('h', m[1]);
    if ((m = raw.match(/^- (.*)$/))) return mk('bullet', m[1]);
    return mk('text', raw);
  });
}

export function serializeBody(lines: Line[]): string {
  return lines
    .map((l) => {
      switch (l.kind) {
        case 'todo':
          return `- [${l.done ? 'x' : ' '}] ${l.text}`;
        case 'h':
          return `# ${l.text}`;
        case 'bullet':
          return `- ${l.text}`;
        default:
          return l.text;
      }
    })
    .join('\n');
}

type Props = {
  noteKey: string;
  body: string;
  onChange: (body: string) => void;
};

export function NoteEditor({ noteKey, body, onChange }: Props) {
  const [lines, setLines] = useState<Line[]>(() => parseBody(body));
  const [focusId, setFocusId] = useState<number | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const lastEmitted = useRef(body);

  // reload when another note is opened or the body changed from outside (sync)
  useEffect(() => {
    if (body !== lastEmitted.current) {
      setLines(parseBody(body));
      lastEmitted.current = body;
    }
  }, [body]);
  useEffect(() => {
    setLines(parseBody(body));
    lastEmitted.current = body;
    setFocusId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteKey]);

  const commit = (next: Line[]) => {
    setLines(next);
    const s = serializeBody(next);
    lastEmitted.current = s;
    onChange(s);
  };

  const update = (id: number, patch: Partial<Line>) =>
    commit(lines.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const onText = (line: Line, text: string) => {
    if (text.includes('\n')) {
      const [first, ...rest] = text.split('\n');
      const idx = lines.findIndex((l) => l.id === line.id);
      const keepKind = line.kind === 'h' ? 'text' : line.kind;
      // Enter on an empty list line ends the list
      if (first === '' && rest.every((r) => r === '') && (line.kind === 'todo' || line.kind === 'bullet')) {
        update(line.id, { kind: 'text', text: '' });
        return;
      }
      const added = rest.map((r) => mk(keepKind, r));
      const next = [
        ...lines.slice(0, idx),
        { ...line, text: first },
        ...added,
        ...lines.slice(idx + 1),
      ];
      commit(next);
      setFocusId(added[added.length - 1].id);
      return;
    }
    update(line.id, { text });
  };

  const onKey = (line: Line, key: string) => {
    if (key !== 'Backspace' || line.text !== '') return;
    const idx = lines.findIndex((l) => l.id === line.id);
    if (line.kind !== 'text') {
      update(line.id, { kind: 'text' });
      return;
    }
    if (lines.length > 1 && idx > 0) {
      commit(lines.filter((l) => l.id !== line.id));
      setFocusId(lines[idx - 1].id);
    }
  };

  const setKind = (kind: Kind) => {
    const target =
      lines.find((l) => l.id === activeId) ?? lines[lines.length - 1];
    if (!target) return;
    update(target.id, { kind: target.kind === kind ? 'text' : kind });
    setFocusId(target.id);
  };

  const addLine = (kind: Kind) => {
    const idx = lines.findIndex((l) => l.id === activeId);
    const nl = mk(kind);
    const next =
      idx >= 0
        ? [...lines.slice(0, idx + 1), nl, ...lines.slice(idx + 1)]
        : [...lines, nl];
    commit(next);
    setFocusId(nl.id);
  };

  const activeKind = useMemo(
    () => lines.find((l) => l.id === activeId)?.kind,
    [lines, activeId],
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.toolbar}>
        <Tool label="Aa" active={activeKind === 'text'} onPress={() => setKind('text')} />
        <Tool label="Titel" active={activeKind === 'h'} onPress={() => setKind('h')} />
        <Tool label="• Liste" active={activeKind === 'bullet'} onPress={() => setKind('bullet')} />
        <Tool label="☐ Checkliste" active={activeKind === 'todo'} onPress={() => setKind('todo')} />
        <Tool label="+ Punkt" onPress={() => addLine('todo')} />
      </View>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 80 }}
        keyboardShouldPersistTaps="handled"
      >
        {lines.map((l) => (
          <View key={l.id} style={styles.row}>
            {l.kind === 'todo' && (
              <Pressable
                onPress={() => update(l.id, { done: !l.done })}
                style={[styles.box, l.done && styles.boxDone]}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: l.done }}
              >
                {l.done && <Text style={styles.tick}>✓</Text>}
              </Pressable>
            )}
            {l.kind === 'bullet' && <Text style={styles.bullet}>•</Text>}
            <TextInput
              value={l.text}
              multiline
              autoFocus={focusId === l.id}
              onFocus={() => setActiveId(l.id)}
              onChangeText={(t) => onText(l, t)}
              onKeyPress={(e) => onKey(l, e.nativeEvent.key)}
              placeholder={lines.length === 1 && l.kind === 'text' ? 'Schreib etwas …' : ''}
              placeholderTextColor={colors.inkSoft + '99'}
              style={[
                styles.input,
                l.kind === 'h' && styles.heading,
                l.kind === 'todo' && l.done && styles.done,
                Platform.OS === 'web' && ({ outlineStyle: 'none' } as any),
              ]}
            />
          </View>
        ))}
        <Pressable onPress={() => addLine('text')} style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

function Tool({ label, onPress, active }: { label: string; onPress: () => void; active?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.tool, active && styles.toolActive]}>
      <Text style={[styles.toolText, active && { color: colors.light }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingBottom: 10 },
  tool: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paperDark,
  },
  toolActive: { backgroundColor: colors.leather, borderColor: colors.leather },
  toolText: { fontFamily: fonts.body, fontSize: 13, color: colors.ink },
  row: { flexDirection: 'row', alignItems: 'flex-start', minHeight: 32 },
  input: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 28,
    color: colors.ink,
    paddingVertical: 0,
    paddingHorizontal: 2,
  },
  heading: { fontFamily: fonts.title, fontSize: 21, lineHeight: 30, color: colors.leather },
  done: { textDecorationLine: 'line-through', color: colors.inkSoft },
  box: {
    width: 20,
    height: 20,
    marginTop: 4,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: colors.leather,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF55',
  },
  boxDone: { backgroundColor: colors.leather },
  tick: { color: colors.gold, fontSize: 14, lineHeight: 16, fontWeight: '700' },
  bullet: { width: 20, fontSize: 18, lineHeight: 28, color: colors.leather },
});
