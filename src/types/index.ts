export interface Library {
  id: number;
  name: string;
  rootPath: string;
  createdAt: string;
}

export interface Track {
  id: number;
  libraryId: number;
  filePath: string;
  relativePath: string;
  pathSegment1: string | null;
  pathSegment2: string | null;
  filename: string;
  title: string | null;
  artist: string | null;
  album: string | null;
  durationSecs: number | null;
  sampleRate: number | null;
  channels: number | null;
  bitDepth: number | null;
  fileSizeBytes: number | null;
  lastModified: string | null;
  indexedAt: string;
}

export interface Tag {
  id: number;
  name: string;
}

export interface Playlist {
  id: number;
  name: string;
  createdAt: string;
}

export interface ScanProgress {
  current: number;
  total: number;
  currentPath: string;
}
