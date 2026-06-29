import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { Library, Track, Tag, TrackTagEntry, Playlist } from "../types";

export const api = {
  // Libraries
  listLibraries: () => invoke<Library[]>("list_libraries"),
  addLibrary: (name: string, rootPath: string) =>
    invoke<Library>("add_library", { name, rootPath }),

  // Tracks
  countTracks: () => invoke<number>("count_tracks"),
  listTracks: (libraryIds: number[], limit: number, offset: number, hideProjectFolders: boolean) =>
    invoke<Track[]>("list_tracks", { libraryIds, limit, offset, hideProjectFolders }),
  searchTracks: (query: string, tagIds: number[], libraryIds: number[], hideProjectFolders: boolean) =>
    invoke<Track[]>("search_tracks", { query, tagIds, libraryIds, hideProjectFolders }),

  // Tags
  listTags: () => invoke<Tag[]>("list_tags"),
  listAllTrackTags: () => invoke<TrackTagEntry[]>("list_all_track_tags"),
  createTag: (name: string) => invoke<Tag>("create_tag", { name }),
  assignTag: (trackId: number, tagId: number) =>
    invoke<void>("assign_tag", { trackId, tagId }),
  removeTag: (trackId: number, tagId: number) =>
    invoke<void>("remove_tag", { trackId, tagId }),
  getTrackTags: (trackId: number) => invoke<Tag[]>("get_track_tags", { trackId }),

  // Playlists
  listPlaylists: () => invoke<Playlist[]>("list_playlists"),
  createPlaylist: (name: string) => invoke<Playlist>("create_playlist", { name }),

  // Dialog helpers
  pickFolder: () => open({ directory: true, multiple: false }) as Promise<string | null>,
};
