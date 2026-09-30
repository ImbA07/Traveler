export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function daysSince(iso: string | null | undefined): number {
  if (!iso) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
}

export function ago(iso: string | null | undefined): string {
  const d = daysSince(iso);
  if (d === 0) return 'heute';
  if (d === 1) return 'gestern';
  if (d < 30) return `vor ${d} Tagen`;
  if (d < 365) return `vor ${Math.floor(d / 30)} Monaten`;
  return `vor ${Math.floor(d / 365)} Jahren`;
}

export function fileLabel(mime: string | null, name: string): string {
  const n = name.toLowerCase();
  if (mime?.startsWith('image/')) return 'IMG';
  if (mime?.startsWith('video/')) return 'VID';
  if (mime === 'application/pdf' || n.endsWith('.pdf')) return 'PDF';
  if (/\.(docx?|odt|rtf)$/.test(n)) return 'DOC';
  if (/\.(xlsx?|csv|ods)$/.test(n)) return 'XLS';
  if (/\.(pptx?|odp)$/.test(n)) return 'PPT';
  if (/\.(zip|rar|7z)$/.test(n)) return 'ZIP';
  return 'FILE';
}

export function snippet(body: string): string {
  return body
    .split('\n')
    .map((l) => l.replace(/^(- \[( |x)\] |# |- )/, ''))
    .filter(Boolean)
    .join(' · ')
    .slice(0, 110);
}
