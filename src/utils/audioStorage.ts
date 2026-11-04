import { Track, Playlist } from '../types/music';

const DB_NAME = 'vinyl_groove_player_db';
const DB_VERSION = 1;
const STORE_TRACKS = 'tracks';
const STORE_PLAYLISTS = 'playlists';

interface StoredTrack extends Omit<Track, 'audioUrl' | 'coverUrl'> {
  audioBlob?: Blob;
  coverBlob?: Blob;
  coverUrlFallback?: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_TRACKS)) {
        db.createObjectStore(STORE_TRACKS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_PLAYLISTS)) {
        db.createObjectStore(STORE_PLAYLISTS, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save or update track in IndexedDB
 */
export async function saveTrackToDB(track: Track): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TRACKS, 'readwrite');
    const store = tx.objectStore(STORE_TRACKS);

    const record: StoredTrack = {
      id: track.id,
      title: track.title,
      artist: track.artist,
      album: track.album,
      duration: track.duration,
      audioBlob: track.audioBlob,
      coverBlob: track.coverBlob,
      coverUrlFallback: track.coverUrl.startsWith('data:') || track.coverUrl.startsWith('/assets') ? track.coverUrl : undefined,
      dateAdded: track.dateAdded,
      favorite: track.favorite,
      fileType: track.fileType,
      fileName: track.fileName,
      sizeBytes: track.sizeBytes,
    };

    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Load all tracks from IndexedDB
 */
export async function loadTracksFromDB(): Promise<Track[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TRACKS, 'readonly');
    const store = tx.objectStore(STORE_TRACKS);
    const req = store.getAll();

    req.onsuccess = () => {
      const records: StoredTrack[] = req.result || [];
      const tracks: Track[] = records.map(r => {
        let audioUrl = '';
        if (r.audioBlob) {
          audioUrl = URL.createObjectURL(r.audioBlob);
        }
        let coverUrl = r.coverUrlFallback || '';
        if (r.coverBlob) {
          coverUrl = URL.createObjectURL(r.coverBlob);
        }

        return {
          id: r.id,
          title: r.title,
          artist: r.artist,
          album: r.album,
          duration: r.duration,
          audioBlob: r.audioBlob,
          coverBlob: r.coverBlob,
          audioUrl,
          coverUrl,
          dateAdded: r.dateAdded,
          favorite: !!r.favorite,
          fileType: r.fileType,
          fileName: r.fileName,
          sizeBytes: r.sizeBytes,
        };
      });
      resolve(tracks);
    };

    req.onerror = () => reject(req.error);
  });
}

/**
 * Delete a track from IndexedDB
 */
export async function deleteTrackFromDB(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TRACKS, 'readwrite');
    const store = tx.objectStore(STORE_TRACKS);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Save playlists
 */
export async function savePlaylistsToDB(playlists: Playlist[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PLAYLISTS, 'readwrite');
    const store = tx.objectStore(STORE_PLAYLISTS);
    store.clear();
    for (const pl of playlists) {
      store.put(pl);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Load playlists
 */
export async function loadPlaylistsFromDB(): Promise<Playlist[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PLAYLISTS, 'readonly');
    const store = tx.objectStore(STORE_PLAYLISTS);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}
