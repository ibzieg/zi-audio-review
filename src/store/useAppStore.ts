import { create } from "zustand";
import type { Library, Track, Tag, TrackTagEntry } from "../types";

interface PlaybackState {
  track: Track | null;
  playing: boolean;
  positionSecs: number;
  durationSecs: number;
}

interface AppState {
  libraries: Library[];
  selectedLibraryIds: number[];
  tracks: Track[];
  selectedTrack: Track | null;
  searchQuery: string;
  activeTagIds: number[];
  allTags: Tag[];
  hideProjectFolders: boolean;
  trackTagMap: Record<number, Tag[]>;
  playback: PlaybackState;
  scanning: boolean;
  scanStatus: string;

  setLibraries: (libs: Library[]) => void;
  setSelectedLibraryIds: (ids: number[]) => void;
  setTracks: (tracks: Track[]) => void;
  setSelectedTrack: (track: Track | null) => void;
  setSearchQuery: (q: string) => void;
  setActiveTagIds: (ids: number[]) => void;
  setAllTags: (tags: Tag[]) => void;
  setHideProjectFolders: (hide: boolean) => void;
  setTrackTagMap: (entries: TrackTagEntry[]) => void;
  setPlayback: (update: Partial<PlaybackState>) => void;
  setScanning: (scanning: boolean, status?: string) => void;
  setScanStatus: (status: string) => void;
  scrollToTrackId: number | null;
  setScrollToTrackId: (id: number | null) => void;
  copiedTags: Tag[];
  setCopiedTags: (tags: Tag[]) => void;
}

export const useAppStore = create<AppState>((set) => ({
  libraries: [],
  selectedLibraryIds: [],
  tracks: [],
  selectedTrack: null,
  searchQuery: "",
  activeTagIds: [],
  allTags: [],
  hideProjectFolders: true,
  trackTagMap: {},
  playback: { track: null, playing: false, positionSecs: 0, durationSecs: 0 },
  scanning: false,
  scanStatus: "",
  scrollToTrackId: null,
  copiedTags: [],

  setLibraries: (libraries) => set({ libraries }),
  setSelectedLibraryIds: (selectedLibraryIds) => set({ selectedLibraryIds }),
  setTracks: (tracks) => set({ tracks }),
  setSelectedTrack: (selectedTrack) => set({ selectedTrack }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setActiveTagIds: (activeTagIds) => set({ activeTagIds }),
  setAllTags: (allTags) => set({ allTags }),
  setHideProjectFolders: (hideProjectFolders) => set({ hideProjectFolders }),
  setTrackTagMap: (entries) => {
    const map: Record<number, Tag[]> = {};
    for (const e of entries) {
      if (!map[e.trackId]) map[e.trackId] = [];
      map[e.trackId].push({ id: e.tagId, name: e.tagName });
    }
    set({ trackTagMap: map });
  },
  setPlayback: (update) =>
    set((s) => ({ playback: { ...s.playback, ...update } })),
  setScanning: (scanning, status) =>
    set((s) => ({ scanning, scanStatus: status ?? s.scanStatus })),
  setScanStatus: (scanStatus) => set({ scanStatus }),
  setScrollToTrackId: (scrollToTrackId) => set({ scrollToTrackId }),
  setCopiedTags: (copiedTags) => set({ copiedTags }),
}));
