export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // in seconds
  coverUrl: string;
  audioUrl: string;
  audioBlob?: Blob;
  coverBlob?: Blob;
  dateAdded: number;
  favorite: boolean;
  fileType: string;
  fileName?: string;
  sizeBytes?: number;
}

export interface Playlist {
  id: string;
  title: string;
  description?: string;
  coverUrl?: string;
  trackIds: string[];
  themeColor: string;
  isSystem?: boolean;
  createdAt: number;
}

export type RepeatMode = 'off' | 'all' | 'one';

export type DiscTheme = 'vinyl' | 'cd-jewel' | 'picture-disc';

export type VisualizerMode = 'bars' | 'wave' | 'circle' | 'off';
