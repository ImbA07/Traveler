import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import React, { useMemo, useState } from 'react';
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  FileItem,
  Folder,
  Note,
  deleteFile,
  deleteFolder,
  deleteNote,
  descendantIds,
  folderPath,
  signedUrl,
  syncNow,
  updateFile,
  uploadFile,
  upsertFolder,
  upsertNote,
  useStore,
} from '../store';
import { supabase } from '../supabase';
import { colors, fonts } from '../theme';
import { ago, daysSince, fileIcon, formatSize, snippet } from '../util';
import { Cleanup } from './Cleanup';
import { NoteEditor } from './NoteEditor';
import { Orb } from './Orb';
import { Btn, ConfirmModal, MenuModal, PickerModal, PromptModal } from './Ui';

type Pane = 'folders' | 'list' | 'note' | 'cleanup';
type Modal =
  | { t: 'newFolder'; parent: string | null }
  | { t: 'renameFolder'; folder: Folder }
  | { t: 'folderMenu'; folder: Folder }
  | { t: 'delFolder'; folder: Folder }
  | { t: 'fileMenu'; file: FileItem }
  | { t: 'moveFile'; file: FileItem }
  | { t: 'moveNote'; note: Note }
  | { t: 'delNote'; note: Note }
  | { t: 'delFile'; file: FileItem }
  | { t: 'logout' }
  | null;

export function Main() {
  const st = useStore();
  const { width } = useWindowDimensions();
  const wide = width >= 900;

  const [folderSel, setFolderSel] = useState<string | null>(null); // null = alles
  const [tagSel, setTagSel] = useState<string | null>(null);
  const [noteId, setNoteId] = useState<string | null>(null);
  const [pane, setPane] = useState<Pane>('list');
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState<Modal>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const folders = useMemo(() => st.folders.filter((f) => !f.deleted_at), [st.folders]);
  const notes = useMemo(() => st.notes.filter((n) => !n.deleted_at), [st.notes]);
  const files = useMemo(() => st.files.filter((f) => !f.deleted_at), [st.files]);

  const allTags = useMemo(() => {
    const m = new Map<string, number>();
    [...notes, ...files].forEach((x) => x.tags.forEach((t) => m.set(t, (m.get(t) ?? 0) + 1)));
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [notes, files]);

  const items = useMemo(() => {
    const scope = folderSel ? descendantIds(folderSel) : null;
    const q = query.trim().toLowerCase();
    const match = (folder_id: string | null, tags: string[], text: string) => {
      if (scope && !(folder_id && scope.has(folder_id))) return false;
      if (tagSel && !tags.includes(tagSel)) return false;
      if (q && !(text.toLowerCase().includes(q) || tags.some((t) => t.toLowerCase().includes(q)))) return false;
      return true;
    };
    const n = notes
      .filter((x) => match(x.folder_id, x.tags, `${x.title}\n${x.body}`))
      .map((x) => ({ kind: 'note' as const, at: x.updated_at, note: x }));
    const f = files
      .filter((x) => match(x.folder_id, x.tags, x.name))
      .map((x) => ({ kind: 'file' as const, at: x.created_at, file: x }));
    return [...n, ...f].sort((a, b) => b.at.localeCompare(a.at));
  }, [notes, files, folderSel, tagSel, query]);

  const note = noteId ? notes.find((n) => n.id === noteId) ?? null : null;

  const title = folderSel ? folders.find((f) => f.id === folderSel)?.name ?? 'Ordner' : 'Alle Einträge';

  // ---- actions ----
  const newNote = () => {
    const n = upsertNote({ folder_id: folderSel, title: '', body: '' });
    setNoteId(n.id);
    setPane('note');
  };

  const openItem = (n: Note) => {
    setNoteId(n.id);
    setPane('note');
  };

  const openFile = async (f: FileItem) => {
    try {
      setBusy('Datei wird geöffnet …');
      const url = await signedUrl(f);
      if (Platform.OS === 'web') window.open(url, '_blank');
      else await Linking.openURL(url);
    } catch (e: any) {
      setBusy(e?.message ?? 'Datei konnte nicht geöffnet werden (offline?)');
      setTimeout(() => setBusy(null), 3500);
      return;
    }
    setBusy(null);
  };

  const uploadAssets = async (
    assets: { uri: string; name: string; mimeType?: string | null; size?: number | null; file?: any }[],
  ) => {
    for (let i = 0; i < assets.length; i++) {
      const a = assets[i];
      try {
        setBusy(`Lade hoch (${i + 1}/${assets.length}): ${a.name}`);
        await uploadFile({
          uri: a.uri,
          file: a.file ?? null,
          name: a.name,
          mimeType: a.mimeType,
          size: a.size,
          folderId: folderSel,
        });
      } catch (e: any) {
        setBusy(`Fehler: ${e?.message ?? e}`);
        setTimeout(() => setBusy(null), 4000);
        return;
      }
    }
    setBusy(null);
  };

  const pickFiles = async () => {
    const r = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true });
    if (r.canceled) return;
    await uploadAssets(
      r.assets.map((a) => ({ uri: a.uri, name: a.name, mimeType: a.mimeType, size: a.size, file: (a as any).file })),
    );
  };

  const pickPhotos = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 1,
    });
    if (r.canceled) return;
    await uploadAssets(
      r.assets.map((a, i) => ({
        uri: a.uri,
        name: a.fileName ?? `Foto-${Date.now()}-${i}.jpg`,
        mimeType: a.mimeType,
        size: a.fileSize,
        file: (a as any).file,
      })),
    );
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setBusy('Kamera-Zugriff wurde nicht erlaubt.');
      setTimeout(() => setBusy(null), 3000);
      return;
    }
    const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
    if (r.canceled) return;
    await uploadAssets(
      r.assets.map((a) => ({
        uri: a.uri,
        name: a.fileName ?? `Foto-${Date.now()}.jpg`,
        mimeType: a.mimeType,
        size: a.fileSize,
      })),
    );
  };

  const folderOptions = (excludeSelf?: string) => [
    { key: null as string | null, label: '(kein Ordner)' },
    ...folders
      .filter((f) => f.id !== excludeSelf)
      .map((f) => ({ key: f.id as string | null, label: folderPath(f.id) }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  ];

  // ---- pieces ----
  const syncLabel =
    st.sync === 'syncing'
      ? 'Synchronisiere …'
      : st.sync === 'offline'
        ? 'Offline – wird später abgeglichen'
        : st.sync === 'error'
          ? 'Sync-Problem (tippen für neuen Versuch)'
          : 'Alles synchronisiert';

  const Sidebar = (
    <View style={[s.sidebar, !wide && { flex: 1 }]}>
      <View style={s.brand}>
        <Orb size={56} pulse={st.sync === 'syncing'} />
        <View style={{ flex: 1 }}>
          <Text style={s.brandTitle}>TRAVELER</Text>
          <Pressable onPress={() => syncNow()}>
            <Text style={[s.sync, st.sync === 'error' && { color: '#E9A79B' }]} numberOfLines={2}>
              {syncLabel}
            </Text>
          </Pressable>
        </View>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
        <SideRow
          label="Alle Einträge"
          count={notes.length + files.length}
          active={folderSel === null && !tagSel && pane !== 'cleanup'}
          onPress={() => {
            setFolderSel(null);
            setTagSel(null);
            setPane('list');
          }}
        />
        <View style={s.sideHead}>
          <Text style={s.sideHeadText}>ORDNER</Text>
          <Pressable onPress={() => setModal({ t: 'newFolder', parent: null })}>
            <Text style={s.plus}>＋</Text>
          </Pressable>
        </View>
        <FolderTree
          parent={null}
          depth={0}
          folders={folders}
          selected={folderSel}
          expanded={expanded}
          setExpanded={setExpanded}
          onSelect={(id) => {
            setFolderSel(id);
            setTagSel(null);
            setPane('list');
          }}
          onMenu={(folder) => setModal({ t: 'folderMenu', folder })}
        />
        {allTags.length > 0 && (
          <>
            <View style={s.sideHead}>
              <Text style={s.sideHeadText}>TAGS</Text>
            </View>
            <View style={s.tagWrap}>
              {allTags.map(([t, c]) => (
                <Pressable
                  key={t}
                  onPress={() => {
                    setTagSel(tagSel === t ? null : t);
                    setPane('list');
                  }}
                  style={[s.tagChip, tagSel === t && s.tagChipOn]}
                >
                  <Text style={[s.tagChipText, tagSel === t && { color: colors.leatherDark }]}>
                    #{t} {c}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}
        <View style={s.sideHead}>
          <Text style={s.sideHeadText}>WERKZEUGE</Text>
        </View>
        <SideRow label="Aufräumen (große Dateien)" active={pane === 'cleanup'} onPress={() => setPane('cleanup')} />
        <SideRow label="Abmelden" onPress={() => setModal({ t: 'logout' })} />
      </ScrollView>
    </View>
  );

  const List = (
    <View style={[s.page, wide && { width: 380 }, !wide && { flex: 1 }]}>
      <View style={s.pageHead}>
        {!wide && (
          <Pressable onPress={() => setPane('folders')} style={s.back}>
            <Text style={s.backText}>☰</Text>
          </Pressable>
        )}
        <Text style={s.pageTitle} numberOfLines={1}>
          {tagSel ? `#${tagSel}` : title}
        </Text>
      </View>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Suchen (Titel, Text, Tags, Dateien) …"
        placeholderTextColor={colors.inkSoft}
        style={[s.search, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
      />
      <View style={s.actions}>
        <Btn label="＋ Notiz" onPress={newNote} />
        <Btn label="Foto" kind="ghost" onPress={pickPhotos} />
        {Platform.OS !== 'web' && <Btn label="Kamera" kind="ghost" onPress={takePhoto} />}
        <Btn label="Datei" kind="ghost" onPress={pickFiles} />
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 30 }}>
        {items.length === 0 && (
          <Text style={s.empty}>
            {query || tagSel ? 'Nichts gefunden.' : 'Noch leer – schreib deine erste Notiz oder lade etwas hoch.'}
          </Text>
        )}
        {items.map((it) =>
          it.kind === 'note' ? (
            <Pressable
              key={it.note.id}
              onPress={() => openItem(it.note)}
              style={[s.card, noteId === it.note.id && wide && s.cardOn]}
            >
              <Text style={s.cardTitle} numberOfLines={1}>
                {it.note.title || 'Ohne Titel'}
              </Text>
              <Text style={s.cardSub} numberOfLines={2}>
                {snippet(it.note.body) || 'Leere Notiz'}
              </Text>
              <Text style={s.cardMeta} numberOfLines={1}>
                {ago(it.note.updated_at)}
                {it.note.tags.length ? '  ·  ' + it.note.tags.map((t) => '#' + t).join(' ') : ''}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              key={it.file.id}
              onPress={() => openFile(it.file)}
              onLongPress={() => setModal({ t: 'fileMenu', file: it.file })}
              style={[s.card, s.fileCard]}
            >
              <Text style={s.fileIcon}>{fileIcon(it.file.mime_type, it.file.name)}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.cardTitle} numberOfLines={1}>
                  {it.file.name}
                </Text>
                <Text style={s.cardMeta}>
                  {formatSize(it.file.size_bytes)} · {ago(it.file.created_at)}
                </Text>
              </View>
              <Pressable hitSlop={10} onPress={() => setModal({ t: 'fileMenu', file: it.file })}>
                <Text style={s.dots}>⋯</Text>
              </Pressable>
            </Pressable>
          ),
        )}
      </ScrollView>
    </View>
  );

  const NotePage = (
    <View style={[s.page, { flex: 1 }]}>
      {note ? (
        <>
          <View style={s.pageHead}>
            {!wide && (
              <Pressable onPress={() => setPane('list')} style={s.back}>
                <Text style={s.backText}>‹</Text>
              </Pressable>
            )}
            <TextInput
              value={note.title}
              onChangeText={(t) => upsertNote({ id: note.id, title: t })}
              placeholder="Titel"
              placeholderTextColor={colors.inkSoft + '99'}
              style={[s.noteTitle, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
            />
          </View>
          <View style={s.metaRow}>
            <Pressable style={s.metaChip} onPress={() => setModal({ t: 'moveNote', note })}>
              <Text style={s.metaChipText}>📁 {folderPath(note.folder_id) || 'Kein Ordner'}</Text>
            </Pressable>
            <Pressable style={[s.metaChip, { borderColor: colors.danger }]} onPress={() => setModal({ t: 'delNote', note })}>
              <Text style={[s.metaChipText, { color: colors.danger }]}>Löschen</Text>
            </Pressable>
          </View>
          <TagInput
            key={note.id}
            tags={note.tags}
            onChange={(tags) => upsertNote({ id: note.id, tags })}
          />
          <NoteEditor
            noteKey={note.id}
            body={note.body}
            onChange={(body) => upsertNote({ id: note.id, body })}
          />
        </>
      ) : (
        <View style={s.blank}>
          <Orb size={150} cracked style={{ opacity: 0.22 }} />
          <Text style={s.blankText}>Wähle eine Notiz oder schreib eine neue.</Text>
        </View>
      )}
    </View>
  );

  const CleanupPage = (
    <View style={[s.page, { flex: 1 }]}>
      <View style={s.pageHead}>
        {!wide && (
          <Pressable onPress={() => setPane('folders')} style={s.back}>
            <Text style={s.backText}>☰</Text>
          </Pressable>
        )}
        <Text style={s.pageTitle}>Aufräumen</Text>
      </View>
      <Cleanup
        files={files}
        onDelete={async (ids) => {
          for (const id of ids) await deleteFile(id);
        }}
      />
    </View>
  );

  let body: React.ReactNode;
  if (wide) {
    body = (
      <View style={s.book}>
        {Sidebar}
        {pane === 'cleanup' ? (
          CleanupPage
        ) : (
          <>
            {List}
            <Spiral />
            {NotePage}
          </>
        )}
      </View>
    );
  } else {
    body = (
      <View style={[s.book, { margin: 0, borderRadius: 0, borderWidth: 0 }]}>
        {pane === 'folders' && Sidebar}
        {pane === 'list' && List}
        {pane === 'note' && NotePage}
        {pane === 'cleanup' && CleanupPage}
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {body}
      {!!busy && (
        <View style={s.toast}>
          <Text style={s.toastText}>{busy}</Text>
        </View>
      )}
      {modal?.t === 'newFolder' && (
        <PromptModal
          title="Neuer Ordner"
          confirmLabel="Anlegen"
          onClose={() => setModal(null)}
          onSubmit={(name) => {
            const f = upsertFolder({ name, parent_id: modal.parent });
            if (modal.parent) setExpanded((e) => ({ ...e, [modal.parent!]: true }));
            setFolderSel(f.id);
            setModal(null);
          }}
        />
      )}
      {modal?.t === 'renameFolder' && (
        <PromptModal
          title="Ordner umbenennen"
          initial={modal.folder.name}
          onClose={() => setModal(null)}
          onSubmit={(name) => {
            upsertFolder({ id: modal.folder.id, name });
            setModal(null);
          }}
        />
      )}
      {modal?.t === 'folderMenu' && (
        <MenuModal
          title={modal.folder.name}
          onClose={() => setModal(null)}
          items={[
            { label: 'Unterordner anlegen', onPress: () => setModal({ t: 'newFolder', parent: modal.folder.id }) },
            { label: 'Umbenennen', onPress: () => setModal({ t: 'renameFolder', folder: modal.folder }) },
            { label: 'Ordner löschen', danger: true, onPress: () => setModal({ t: 'delFolder', folder: modal.folder }) },
          ]}
        />
      )}
      {modal?.t === 'delFolder' && (
        <ConfirmModal
          title={`„${modal.folder.name}“ löschen?`}
          text="Der Ordner und seine Unterordner werden gelöscht. Notizen und Dateien darin bleiben erhalten und landen unter „Alle Einträge“."
          onClose={() => setModal(null)}
          onConfirm={() => {
            if (folderSel && descendantIds(modal.folder.id).has(folderSel)) setFolderSel(null);
            deleteFolder(modal.folder.id);
            setModal(null);
          }}
        />
      )}
      {modal?.t === 'fileMenu' && (
        <MenuModal
          title={modal.file.name}
          onClose={() => setModal(null)}
          items={[
            { label: 'Öffnen', onPress: () => openFile(modal.file) },
            { label: 'In Ordner verschieben', onPress: () => setModal({ t: 'moveFile', file: modal.file }) },
            { label: 'Löschen', danger: true, onPress: () => setModal({ t: 'delFile', file: modal.file }) },
          ]}
        />
      )}
      {modal?.t === 'moveFile' && (
        <PickerModal
          title="Verschieben nach …"
          options={folderOptions()}
          onClose={() => setModal(null)}
          onPick={(k) => updateFile(modal.file.id, { folder_id: k })}
        />
      )}
      {modal?.t === 'moveNote' && (
        <PickerModal
          title="Verschieben nach …"
          options={folderOptions()}
          onClose={() => setModal(null)}
          onPick={(k) => upsertNote({ id: modal.note.id, folder_id: k })}
        />
      )}
      {modal?.t === 'delNote' && (
        <ConfirmModal
          title="Notiz löschen?"
          text={`„${modal.note.title || 'Ohne Titel'}“ wird gelöscht.`}
          onClose={() => setModal(null)}
          onConfirm={() => {
            deleteNote(modal.note.id);
            setNoteId(null);
            if (!wide) setPane('list');
            setModal(null);
          }}
        />
      )}
      {modal?.t === 'delFile' && (
        <ConfirmModal
          title="Datei löschen?"
          text={`„${modal.file.name}“ wird endgültig gelöscht (auf allen Geräten).`}
          onClose={() => setModal(null)}
          onConfirm={() => {
            deleteFile(modal.file.id);
            setModal(null);
          }}
        />
      )}
      {modal?.t === 'logout' && (
        <ConfirmModal
          title="Abmelden?"
          text="Deine Daten bleiben online gespeichert. Auf diesem Gerät werden sie beim Abmelden nicht gelöscht."
          confirmLabel="Abmelden"
          onClose={() => setModal(null)}
          onConfirm={() => {
            setModal(null);
            supabase.auth.signOut();
          }}
        />
      )}
    </View>
  );
}

function SideRow({
  label,
  count,
  active,
  onPress,
  indent = 0,
  right,
}: {
  label: string;
  count?: number;
  active?: boolean;
  onPress: () => void;
  indent?: number;
  right?: React.ReactNode;
}) {
  return (
    <Pressable onPress={onPress} style={[s.sideRow, active && s.sideRowOn, { paddingLeft: 14 + indent * 16 }]}>
      <Text style={[s.sideText, active && { color: colors.goldSoft }]} numberOfLines={1}>
        {label}
      </Text>
      {count !== undefined && <Text style={s.sideCount}>{count}</Text>}
      {right}
    </Pressable>
  );
}

function FolderTree({
  parent,
  depth,
  folders,
  selected,
  expanded,
  setExpanded,
  onSelect,
  onMenu,
}: {
  parent: string | null;
  depth: number;
  folders: Folder[];
  selected: string | null;
  expanded: Record<string, boolean>;
  setExpanded: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  onSelect: (id: string) => void;
  onMenu: (f: Folder) => void;
}) {
  const kids = folders
    .filter((f) => f.parent_id === parent)
    .sort((a, b) => a.name.localeCompare(b.name));
  return (
    <>
      {kids.map((f) => {
        const hasKids = folders.some((x) => x.parent_id === f.id);
        const open = expanded[f.id];
        return (
          <View key={f.id}>
            <SideRow
              label={`${hasKids ? (open ? '▾ ' : '▸ ') : '   '}${f.name}`}
              indent={depth}
              active={selected === f.id}
              onPress={() => {
                onSelect(f.id);
                if (hasKids) setExpanded((e) => ({ ...e, [f.id]: !e[f.id] }));
              }}
              right={
                <Pressable hitSlop={10} onPress={() => onMenu(f)}>
                  <Text style={s.dotsLight}>⋯</Text>
                </Pressable>
              }
            />
            {open && (
              <FolderTree
                parent={f.id}
                depth={depth + 1}
                folders={folders}
                selected={selected}
                expanded={expanded}
                setExpanded={setExpanded}
                onSelect={onSelect}
                onMenu={onMenu}
              />
            )}
          </View>
        );
      })}
    </>
  );
}

function TagInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [v, setV] = useState('');
  const add = () => {
    const parts = v
      .split(/[,\s]+/)
      .map((x) => x.replace(/^#/, '').trim())
      .filter(Boolean);
    if (parts.length) onChange(Array.from(new Set([...tags, ...parts])));
    setV('');
  };
  return (
    <View style={s.tagRow}>
      {tags.map((t) => (
        <Pressable key={t} style={s.tagOn} onPress={() => onChange(tags.filter((x) => x !== t))}>
          <Text style={s.tagOnText}>#{t} ✕</Text>
        </Pressable>
      ))}
      <TextInput
        value={v}
        onChangeText={(x) => (x.endsWith(',') || x.endsWith(' ') ? (setV(x), add()) : setV(x))}
        onSubmitEditing={add}
        onBlur={add}
        placeholder="＋ Tag"
        placeholderTextColor={colors.inkSoft}
        style={[s.tagInput, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
        autoCapitalize="none"
      />
    </View>
  );
}

function Spiral() {
  return (
    <View style={s.spiral}>
      {Array.from({ length: 16 }).map((_, i) => (
        <View key={i} style={s.ring} />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  book: {
    flex: 1,
    flexDirection: 'row',
    margin: 18,
    borderRadius: 14,
    borderWidth: 4,
    borderColor: colors.leather,
    overflow: 'hidden',
    backgroundColor: colors.paper,
  },
  sidebar: {
    width: 270,
    backgroundColor: colors.leatherDark,
    borderRightWidth: 3,
    borderColor: colors.gold + '99',
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  brandTitle: { fontFamily: fonts.title, color: colors.light, fontSize: 20, letterSpacing: 4 },
  sync: { fontFamily: fonts.body, color: colors.goldSoft, fontSize: 12, marginTop: 2 },
  sideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingRight: 12,
    gap: 8,
  },
  sideRowOn: { backgroundColor: '#FFFFFF14', borderLeftWidth: 3, borderColor: colors.gold },
  sideText: { flex: 1, fontFamily: fonts.body, color: colors.paper, fontSize: 15 },
  sideCount: { fontFamily: fonts.body, color: colors.gold, fontSize: 12 },
  sideHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginTop: 18,
    marginBottom: 4,
  },
  sideHeadText: { fontFamily: fonts.title, fontSize: 12, letterSpacing: 3, color: colors.gold },
  plus: { color: colors.goldSoft, fontSize: 20 },
  dotsLight: { color: colors.gold, fontSize: 18, paddingHorizontal: 4 },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 14 },
  tagChip: { borderWidth: 1, borderColor: colors.gold + '88', borderRadius: 12, paddingHorizontal: 9, paddingVertical: 3 },
  tagChipOn: { backgroundColor: colors.gold },
  tagChipText: { color: colors.paper, fontFamily: fonts.body, fontSize: 12 },
  page: { backgroundColor: colors.paper, padding: 16 },
  pageHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  pageTitle: { flex: 1, fontFamily: fonts.title, fontSize: 22, color: colors.leather },
  back: { paddingRight: 6 },
  backText: { fontSize: 26, color: colors.leather },
  search: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#FFFFFF55',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontFamily: fonts.body,
    color: colors.ink,
    marginBottom: 10,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  empty: { fontFamily: fonts.hand, fontSize: 22, color: colors.inkSoft, textAlign: 'center', marginTop: 40 },
  card: {
    backgroundColor: '#FFFFFF66',
    borderWidth: 1,
    borderColor: colors.line,
    borderLeftWidth: 4,
    borderLeftColor: colors.gold,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  cardOn: { backgroundColor: '#FFFFFFAA', borderLeftColor: colors.leather },
  fileCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderLeftColor: colors.leatherLight },
  fileIcon: { fontSize: 24 },
  cardTitle: { fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },
  cardSub: { fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft, marginTop: 2 },
  cardMeta: { fontFamily: fonts.body, fontSize: 11, color: colors.inkSoft, marginTop: 4 },
  dots: { fontSize: 22, color: colors.inkSoft, paddingHorizontal: 6 },
  noteTitle: { flex: 1, fontFamily: fonts.hand, fontSize: 34, color: colors.leather, paddingVertical: 0 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  metaChip: { borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
  metaChipText: { fontFamily: fonts.body, fontSize: 12, color: colors.inkSoft },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 12 },
  tagOn: { backgroundColor: colors.leather, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 3 },
  tagOnText: { color: colors.goldSoft, fontFamily: fonts.body, fontSize: 12 },
  tagInput: { fontFamily: fonts.body, fontSize: 13, color: colors.ink, minWidth: 70, paddingVertical: 2 },
  blank: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  blankText: { fontFamily: fonts.hand, fontSize: 26, color: colors.inkSoft },
  spiral: {
    width: 26,
    backgroundColor: colors.paperDark,
    justifyContent: 'space-evenly',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.line,
  },
  ring: {
    width: 30,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.leatherLight,
    borderWidth: 1,
    borderColor: colors.leatherDark,
  },
  toast: {
    position: 'absolute',
    bottom: 26,
    alignSelf: 'center',
    backgroundColor: colors.leatherDark,
    borderColor: colors.gold,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 9,
    maxWidth: '90%',
  },
  toastText: { color: colors.paper, fontFamily: fonts.body, fontSize: 13 },
});
