export interface CatalogSong {
  id: string;
  title: string;
  filename: string;
  url: string;
  localPath?: string;
}

export function isFolderTrack(song: CatalogSong): boolean {
  return song.id.startsWith('custom:') || song.id.startsWith('custom-');
}

/** A managed catalog refresh must retain files from the user's music folder. */
export function retainFolderTracks<T extends CatalogSong>(managed: readonly T[], previous: readonly T[], enabled: boolean): T[] {
  return uniqueSongs([...managed, ...(enabled ? previous.filter(isFolderTrack) : [])]);
}

/** Both source manifests are append-only/oldest-first. Local private IDs win. */
export function mergePrivateManifest<T extends CatalogSong>(remote: readonly T[], local: readonly T[]): T[] {
  const privateIds = new Set(local.map(song => song.id));
  return uniqueSongs([...uniqueSongs(remote).filter(song => !privateIds.has(song.id)), ...local]);
}

function uniqueSongs<T extends CatalogSong>(songs: readonly T[]): T[] {
  const byId = new Map<string, T>();
  for (const song of songs) {
    if (song && typeof song.id === 'string' && typeof song.title === 'string'
      && typeof song.filename === 'string' && typeof song.url === 'string'
      && song.id && !byId.has(song.id)) byId.set(song.id, song);
  }
  return [...byId.values()];
}

/** New IDs lead; previously known songs retain their established relative order. */
export function promoteNewTracks<T extends CatalogSong>(incomingNewestFirst: readonly T[], previous: readonly CatalogSong[]): T[] {
  const incoming = uniqueSongs(incomingNewestFirst);
  const byId = new Map(incoming.map(song => [song.id, song]));
  const known = uniqueSongs(previous);
  const previousIds = new Set(known.map(song => song.id));
  return uniqueSongs([
    ...incoming.filter(song => !previousIds.has(song.id)),
    ...known.flatMap(song => byId.has(song.id) ? [byId.get(song.id)!] : []),
  ]);
}

/** Introduce private/new bundled songs immediately, including when offline. */
export function mergeCachedTracks<T extends CatalogSong>(defaultsNewestFirst: readonly T[], cached: readonly T[]): T[] {
  const validCache = uniqueSongs(cached);
  const cachedById = new Map(validCache.map(song => [song.id, song]));
  const defaultIds = new Set(defaultsNewestFirst.map(song => song.id));
  const defaults = defaultsNewestFirst.map(song => {
    const old = cachedById.get(song.id);
    return old ? { ...old, ...song, localPath: old.localPath, url: old.localPath || song.url } : song;
  });
  return promoteNewTracks([...defaults, ...validCache.filter(song => !defaultIds.has(song.id))], validCache);
}

/** Sorting changes positions, never the identity of the selected/playing song. */
export function preserveTrackIndex(previous: readonly CatalogSong[], index: number, next: readonly CatalogSong[]): number {
  const selected = previous[index];
  if (!selected) return 0;
  let found = next.findIndex(song => song.id === selected.id);
  // Migration for the old folder IDs that included their changing array index.
  if (found < 0) found = next.findIndex(song => song.filename === selected.filename
    && (song.localPath || song.url) === (selected.localPath || selected.url));
  return found < 0 ? 0 : found;
}

/** The requested startup song is independent of the last session's selection. */
export function startupTrackIndex(tracks:readonly CatalogSong[]):number {
  return Math.max(0,tracks.findIndex(song=>song.id==='gs_christmas_remix_01'));
}
