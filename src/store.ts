import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as Crypto from 'expo-crypto';
import { useSyncExternalStore } from 'react';
import { BUCKET } from './config';
import { supabase } from './supabase';

export type Folder = {
  id: string;
  user_id?: string;
  parent_id: string | null;
  name: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};
export type Note = {
  id: string;
  user_id?: string;
  folder_id: string | null;
  title: string;
  body: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};
export type FileItem = {
  id: string;
  user_id?: string;
  folder_id: string | null;
  name: string;
  mime_type: string | null;
  size_bytes: number;
  storage_path: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  last_opened_at: string | null;
  deleted_at: string | null;
};

type Table = 'folders' | 'notes' | 'files';
const TABLE_NAME: Record<Table, string> = {
  folders: 'traveler_folders',
  notes: 'traveler_notes',
  files: 'traveler_files',
};

export type SyncState = 'idle' | 'syncing' | 'offline' | 'error';

type State = {
  ready: boolean;
  userId: string | null;
  folders: Folder[];
  notes: Note[];
  files: FileItem[];
  dirty: Record<string, true>; // key: `${table}:${id}`
  lastPull: Record<Table, string | null>;
  sync: SyncState;
  lastSync: string | null;
  syncError: string | null;
};

const emptyState = (): State => ({
  ready: false,
  userId: null,
  folders: [],
  notes: [],
  files: [],
  dirty: {},
  lastPull: { folders: null, notes: null, files: null },
  sync: 'idle',
  lastSync: null,
  syncError: null,
});

let state: State = emptyState();
const listeners = new Set<() => void>();
const storageKey = (uid: string) => `traveler.data.v1.${uid}`;

function emit() {
  state = { ...state };
  listeners.forEach((l) => l());
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;
function persist() {
  if (!state.userId) return;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    if (!state.userId) return;
    const { folders, notes, files, dirty, lastPull, lastSync } = state;
    AsyncStorage.setItem(
      storageKey(state.userId),
      JSON.stringify({ folders, notes, files, dirty, lastPull, lastSync }),
    ).catch(() => {});
  }, 300);
}

export function useStore(): State {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

export const now = () => new Date().toISOString();
export const newId = () => Crypto.randomUUID();

// ---------- session / loading ----------

export async function loadForUser(userId: string) {
  state = { ...emptyState(), userId };
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (raw) state = { ...state, ...JSON.parse(raw), userId };
  } catch {}
  state.ready = true;
  state.sync = 'idle';
  emit();
  scheduleSync(50);
}

export function unloadUser() {
  state = { ...emptyState(), ready: true };
  emit();
}

// ---------- mutations (local first, synced later) ----------

function mark(table: Table, id: string) {
  state.dirty[`${table}:${id}`] = true;
}

export function upsertFolder(f: Partial<Folder> & { id?: string; name: string }): Folder {
  const t = now();
  const existing = f.id ? state.folders.find((x) => x.id === f.id) : undefined;
  const row: Folder = existing
    ? { ...existing, ...f, updated_at: t }
    : {
        id: f.id ?? newId(),
        parent_id: f.parent_id ?? null,
        name: f.name,
        created_at: t,
        updated_at: t,
        deleted_at: null,
      };
  state.folders = existing
    ? state.folders.map((x) => (x.id === row.id ? row : x))
    : [...state.folders, row];
  mark('folders', row.id);
  emit();
  persist();
  scheduleSync();
  return row;
}

export function deleteFolder(id: string) {
  // delete folder + subfolders; notes/files inside move to "no folder" (root)
  const ids = new Set<string>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const f of state.folders) {
      if (f.parent_id && ids.has(f.parent_id) && !ids.has(f.id)) {
        ids.add(f.id);
        grew = true;
      }
    }
  }
  const t = now();
  state.folders = state.folders.map((f) => {
    if (!ids.has(f.id)) return f;
    mark('folders', f.id);
    return { ...f, deleted_at: t, updated_at: t };
  });
  state.notes = state.notes.map((n) => {
    if (!n.folder_id || !ids.has(n.folder_id)) return n;
    mark('notes', n.id);
    return { ...n, folder_id: null, updated_at: t };
  });
  state.files = state.files.map((n) => {
    if (!n.folder_id || !ids.has(n.folder_id)) return n;
    mark('files', n.id);
    return { ...n, folder_id: null, updated_at: t };
  });
  emit();
  persist();
  scheduleSync();
}

export function upsertNote(n: Partial<Note> & { id?: string }): Note {
  const t = now();
  const existing = n.id ? state.notes.find((x) => x.id === n.id) : undefined;
  const row: Note = existing
    ? { ...existing, ...n, updated_at: t }
    : {
        id: n.id ?? newId(),
        folder_id: n.folder_id ?? null,
        title: n.title ?? '',
        body: n.body ?? '',
        tags: n.tags ?? [],
        created_at: t,
        updated_at: t,
        deleted_at: null,
      };
  state.notes = existing
    ? state.notes.map((x) => (x.id === row.id ? row : x))
    : [...state.notes, row];
  mark('notes', row.id);
  emit();
  persist();
  scheduleSync(2500);
  return row;
}

export function deleteNote(id: string) {
  const t = now();
  state.notes = state.notes.map((n) =>
    n.id === id ? { ...n, deleted_at: t, updated_at: t } : n,
  );
  mark('notes', id);
  emit();
  persist();
  scheduleSync();
}

export function updateFile(id: string, patch: Partial<FileItem>) {
  const t = now();
  state.files = state.files.map((f) =>
    f.id === id ? { ...f, ...patch, updated_at: t } : f,
  );
  mark('files', id);
  emit();
  persist();
  scheduleSync();
}

export async function deleteFile(id: string) {
  const f = state.files.find((x) => x.id === id);
  if (!f) return;
  updateFile(id, { deleted_at: now() });
  // remove the stored bytes as well (frees space); ignore failures
  supabase.storage.from(BUCKET).remove([f.storage_path]).catch(() => {});
}

export type UploadInput = {
  uri: string;
  file?: Blob | null; // web
  name: string;
  mimeType?: string | null;
  size?: number | null;
  folderId: string | null;
};

export async function uploadFile(input: UploadInput): Promise<FileItem> {
  if (!state.userId) throw new Error('Nicht angemeldet');
  const net = await NetInfo.fetch();
  if (net.isConnected === false) {
    throw new Error('Zum Hochladen von Dateien brauchst du Internet.');
  }
  const id = newId();
  const safe = input.name.replace(/[^\w.\-]+/g, '_');
  const path = `${state.userId}/${id}-${safe}`;
  const blob: Blob = input.file ?? (await (await fetch(input.uri)).blob());
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: input.mimeType ?? blob.type ?? 'application/octet-stream',
    upsert: false,
  });
  if (error) throw error;
  const t = now();
  const row: FileItem = {
    id,
    folder_id: input.folderId,
    name: input.name,
    mime_type: input.mimeType ?? blob.type ?? null,
    size_bytes: input.size ?? blob.size ?? 0,
    storage_path: path,
    tags: [],
    created_at: t,
    updated_at: t,
    last_opened_at: t,
    deleted_at: null,
  };
  state.files = [...state.files, row];
  mark('files', id);
  emit();
  persist();
  scheduleSync();
  return row;
}

export async function signedUrl(f: FileItem): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(f.storage_path, 60 * 10);
  if (error || !data) throw error ?? new Error('Datei nicht erreichbar');
  updateFile(f.id, { last_opened_at: now() });
  return data.signedUrl;
}

// ---------- sync ----------

let syncTimer: ReturnType<typeof setTimeout> | null = null;
let syncing = false;
let syncAgain = false;

export function scheduleSync(delay = 800) {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    void syncNow();
  }, delay);
}

const newer = (a: string, b: string) => new Date(a).getTime() > new Date(b).getTime();

export async function syncNow() {
  if (!state.userId) return;
  if (syncing) {
    syncAgain = true;
    return;
  }
  const net = await NetInfo.fetch();
  if (net.isConnected === false) {
    state.sync = 'offline';
    emit();
    return;
  }
  syncing = true;
  state.sync = 'syncing';
  state.syncError = null;
  emit();
  try {
    await push();
    await pull();
    state.sync = 'idle';
    state.lastSync = now();
  } catch (e: any) {
    state.sync = 'error';
    state.syncError = e?.message ?? String(e);
  } finally {
    syncing = false;
    emit();
    persist();
    if (syncAgain) {
      syncAgain = false;
      scheduleSync(300);
    }
  }
}

async function push() {
  const keys = Object.keys(state.dirty);
  if (!keys.length) return;
  const sent: string[] = [];
  const rowsByTable: Record<Table, any[]> = { folders: [], notes: [], files: [] };
  const sentVersion: Record<string, string> = {};
  for (const key of keys) {
    const [table, id] = key.split(':') as [Table, string];
    const row = (state[table] as any[]).find((r) => r.id === id);
    if (!row) {
      sent.push(key);
      continue;
    }
    rowsByTable[table].push({ ...row, user_id: state.userId });
    sentVersion[key] = row.updated_at;
  }
  // folders first (parents before children), then notes and files
  const folderRows = rowsByTable.folders.sort(
    (a, b) => depth(a.id) - depth(b.id),
  );
  const order: [Table, any[]][] = [
    ['folders', folderRows],
    ['notes', rowsByTable.notes],
    ['files', rowsByTable.files],
  ];
  for (const [table, rows] of order) {
    if (!rows.length) continue;
    // insert parents first for nested folders
    const chunks = table === 'folders' ? rows.map((r) => [r]) : [rows];
    for (const chunk of chunks) {
      const { error } = await supabase.from(TABLE_NAME[table]).upsert(chunk);
      if (error) throw error;
      for (const r of chunk) sent.push(`${table}:${r.id}`);
    }
  }
  for (const key of sent) {
    const [table, id] = key.split(':') as [Table, string];
    const row = (state[table] as any[]).find((r) => r.id === id);
    // only clear if not modified again while we were sending
    if (!row || row.updated_at === sentVersion[key]) delete state.dirty[key];
  }
}

function depth(id: string): number {
  let d = 0;
  let cur = state.folders.find((f) => f.id === id);
  while (cur?.parent_id && d < 50) {
    d++;
    cur = state.folders.find((f) => f.id === cur!.parent_id);
  }
  return d;
}

async function pull() {
  for (const table of ['folders', 'notes', 'files'] as Table[]) {
    let since = state.lastPull[table];
    // page through changes
    for (;;) {
      let q = supabase
        .from(TABLE_NAME[table])
        .select('*')
        .order('updated_at', { ascending: true })
        .limit(500);
      if (since) q = q.gt('updated_at', since);
      const { data, error } = await q;
      if (error) throw error;
      if (!data || !data.length) break;
      const list = state[table] as any[];
      const map = new Map(list.map((r) => [r.id, r]));
      for (const remote of data as any[]) {
        const local = map.get(remote.id);
        const isDirty = state.dirty[`${table}:${remote.id}`];
        if (local && isDirty && newer(local.updated_at, remote.updated_at)) continue;
        map.set(remote.id, remote);
        if (isDirty) delete state.dirty[`${table}:${remote.id}`];
      }
      (state as any)[table] = Array.from(map.values());
      since = data[data.length - 1].updated_at;
      state.lastPull[table] = since;
      if (data.length < 500) break;
    }
  }
}

// keep syncing in the background
let started = false;
export function startBackgroundSync() {
  if (started) return;
  started = true;
  NetInfo.addEventListener((s) => {
    if (s.isConnected) scheduleSync(500);
    else if (state.userId) {
      state.sync = 'offline';
      emit();
    }
  });
  setInterval(() => {
    if (state.userId) scheduleSync(0);
  }, 30000);
}

// ---------- helpers ----------

export function folderChildren(parentId: string | null): Folder[] {
  return state.folders
    .filter((f) => !f.deleted_at && f.parent_id === parentId)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function folderPath(id: string | null): string {
  const parts: string[] = [];
  let cur = id ? state.folders.find((f) => f.id === id) : undefined;
  let guard = 0;
  while (cur && guard++ < 50) {
    parts.unshift(cur.name);
    cur = cur.parent_id ? state.folders.find((f) => f.id === cur!.parent_id) : undefined;
  }
  return parts.join(' / ');
}

export function descendantIds(id: string): Set<string> {
  const ids = new Set<string>([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const f of state.folders) {
      if (!f.deleted_at && f.parent_id && ids.has(f.parent_id) && !ids.has(f.id)) {
        ids.add(f.id);
        grew = true;
      }
    }
  }
  return ids;
}
