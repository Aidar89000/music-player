import { Track, RepeatMode } from '../types/music';

/**
 * Format duration in seconds to mm:ss (or hh:mm:ss if > 1 hour)
 */
export function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
  const totalSecs = Math.floor(seconds);
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  const paddedSecs = secs.toString().padStart(2, '0');
  if (hrs > 0) {
    const paddedMins = mins.toString().padStart(2, '0');
    return `${hrs}:${paddedMins}:${paddedSecs}`;
  }
  return `${mins}:${paddedSecs}`;
}

/**
 * Parse a raw audio file name to extract artist and title cleanly
 */
export function parseFileNameToMetadata(fileName: string): { title: string; artist: string } {
  // Strip extension
  const baseName = fileName.replace(/\.[^/.]+$/, '').trim();

  // Pattern: "Artist - Title" or "Artist - Track - Title"
  if (baseName.includes(' - ')) {
    const parts = baseName.split(' - ');
    const artist = parts[0].trim();
    // Strip track numbers like "01", "1." from title if present
    const rawTitle = parts.slice(1).join(' - ').trim();
    const cleanTitle = rawTitle.replace(/^\d+[\.\s\-_]+/, '').trim();
    return {
      artist: artist || 'Неизвестный исполнитель',
      title: cleanTitle || rawTitle || 'Без названия'
    };
  }

  // Pattern: "01. Title" or "01 Title"
  const strippedNumber = baseName.replace(/^\d+[\.\s\-_]+/, '').trim();
  return {
    artist: 'Неизвестный исполнитель',
    title: strippedNumber || baseName || 'Без названия'
  };
}

/**
 * Get next track index given queue, current index, repeat mode, and shuffle
 */
export function getNextTrackIndex(
  currentIndex: number,
  totalTracks: number,
  repeatMode: RepeatMode
): number {
  if (totalTracks <= 0) return -1;
  if (repeatMode === 'one') {
    return currentIndex;
  }
  if (currentIndex >= totalTracks - 1) {
    // End of playlist
    return repeatMode === 'all' ? 0 : -1;
  }
  return currentIndex + 1;
}

/**
 * Get previous track index. If currentTime > 3 seconds, returns same track to restart.
 */
export function getPrevTrackIndex(
  currentIndex: number,
  totalTracks: number,
  currentTime: number = 0
): number {
  if (totalTracks <= 0) return -1;
  if (currentTime > 3) {
    return currentIndex;
  }
  if (currentIndex <= 0) {
    return totalTracks - 1;
  }
  return currentIndex - 1;
}

/**
 * Shuffle playlist tracks while optionally pinning the current track at the beginning
 */
export function shuffleQueue(tracks: Track[], currentTrackId?: string): Track[] {
  if (tracks.length <= 1) return [...tracks];
  const list = [...tracks];

  // Fisher-Yates shuffle
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }

  // If currentTrackId specified, move it to index 0 so playback continues uninterrupted
  if (currentTrackId) {
    const currentIdx = list.findIndex(t => t.id === currentTrackId);
    if (currentIdx > 0) {
      const [currentTrack] = list.splice(currentIdx, 1);
      list.unshift(currentTrack);
    }
  }

  return list;
}

/**
 * Filter tracks by search query across title, artist, and album in real time.
 * Supports multi-word matching and relevance ranking.
 */
export function filterTracks(tracks: Track[], query: string): Track[] {
  const clean = query.trim().toLowerCase();
  if (!clean) return tracks;

  const terms = clean.split(/\s+/).filter(Boolean);

  return tracks
    .map(track => {
      const titleLower = (track.title || '').toLowerCase();
      const artistLower = (track.artist || '').toLowerCase();
      const albumLower = (track.album || '').toLowerCase();
      const fileLower = (track.fileName || '').toLowerCase();

      // Check if all search terms match either title, artist, album, or fileName
      const matchesAllTerms = terms.every(
        term =>
          titleLower.includes(term) ||
          artistLower.includes(term) ||
          albumLower.includes(term) ||
          fileLower.includes(term)
      );

      if (!matchesAllTerms) return null;

      // Score for relevance ranking:
      // Exact title match = 100
      // Title starts with term = 50
      // Title includes term = 30
      // Artist includes term = 20
      // Album includes term = 10
      let score = 0;
      if (titleLower === clean) score += 100;
      else if (titleLower.startsWith(clean)) score += 50;
      else if (titleLower.includes(clean)) score += 30;

      if (artistLower.includes(clean)) score += 20;
      if (albumLower.includes(clean)) score += 10;

      return { track, score };
    })
    .filter((item): item is { track: Track; score: number } => item !== null)
    .sort((a, b) => b.score - a.score)
    .map(item => item.track);
}
