import { create } from "zustand";
import type { Library, Track, Tag } from "../types";

interface PlaybackState {
  track: Track | null;
  playing: boolean;
  positionSecs: number;
  durationSecs: number;
}

interface AppState {
  libraries: Library[];
  selectedLibraryId: number | null;
  tracks: Track[];
  selectedTrack: Track | null;
  searchQuery: string;
  activeTagIds: number[];
  allTags: Tag[];
  playback: PlaybackState;
  scanning: boolean;
  scanStatus: string;

  setLibraries: (libs: Library[]) => void;
  setSelectedLibraryId: (id: number | null) => void;
  setTracks: (tracks: Track[]) => void;
  setSelectedTrack: (track: Track | null) => void;
  setSearchQuery: (q: string) => void;
  setActiveTagIds: (ids: number[]) => void;
  setAllTags: (tags: Tag[]) => void;
  setPlayback: (update: Partial<PlaybackState>) => void;
  setScanning: (scanning: boolean, status?: string) => void;
  setScanStatus: (status: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  libraries: [],
  selectedLibraryId: null,
  tracks: [],
  selectedTrack: null,
  searchQuery: "",
  activeTagIds: [],
  allTags: [],
  playback: { track: null, playing: false, positionSecs: 0, durationSecs: 0 },
  scanning: false,
  scanStatus: "",

  setLibraries: (libraries) => set({ libraries }),
  setSelectedLibraryId: (selectedLibraryId) => set({ selectedLibraryId }),
  setTracks: (tracks) => set({ tracks }),
  setSelectedTrack: (selectedTrack) => set({ selectedTrack }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setActiveTagIds: (activeTagIds) => set({ activeTagIds }),
  setAllTags: (allTags) => set({ allTags }),
  setPlayback: (update) =>
    set((s) => ({ playback: { ...s.playback, ...update } })),
  setScanning: (scanning, status) =>
    set((s) => ({ scanning, scanStatus: status ?? s.scanStatus })),
  setScanStatus: (scanStatus) => set({ scanStatus }),
}));
