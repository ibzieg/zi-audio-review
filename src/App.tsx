import { useEffect, useCallback } from "react";
import { useAppStore } from "./store/useAppStore";
import { api } from "./lib/tauri";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { TrackList } from "./components/TrackList/TrackList";
import { Player } from "./components/Player/Player";
import { AudioElement } from "./components/Player/AudioElement";
import { SearchBar } from "./components/SearchBar/SearchBar";
import { TagFilterBar } from "./components/Tags/TagFilterBar";
import { TrackTagEditor } from "./components/Tags/TrackTagEditor";
import "./App.css";

export default function App() {
  const {
    selectedLibraryIds, tracks, searchQuery, activeTagIds, hideProjectFolders,
    setLibraries, setSelectedLibraryIds, setTracks, setAllTags, setScanStatus, setTrackTagMap,
  } = useAppStore();

  const loadLibraries = useCallback(async () => {
    const libs = await api.listLibraries();
    setLibraries(libs);
    // Default: all libraries selected
    if (libs.length > 0) {
      setSelectedLibraryIds(libs.map((l) => l.id));
    }
  }, [setLibraries, setSelectedLibraryIds]);

  const loadTracks = useCallback(async (
    libraryIds: number[], query: string, tagIds: number[], hidePF: boolean
  ) => {
    try {
      if (query.trim() || tagIds.length > 0) {
        const t = await api.searchTracks(query, tagIds, libraryIds, hidePF);
        setTracks(t);
      } else {
        const t = await api.listTracks(libraryIds, 5000, 0, hidePF);
        setTracks(t);
      }
    } catch (err) {
      setScanStatus(`Search error: ${err}`);
    }
  }, [setTracks, setScanStatus]);

  useEffect(() => {
    loadLibraries();
    api.listTags().then(setAllTags);
    api.listAllTrackTags().then(setTrackTagMap);
  }, []);

  // Use join as dep key to avoid array-reference churn
  const libKey = selectedLibraryIds.join(",");
  useEffect(() => {
    if (selectedLibraryIds.length > 0) {
      loadTracks(selectedLibraryIds, searchQuery, activeTagIds, hideProjectFolders);
    } else {
      setTracks([]);
    }
  }, [libKey, searchQuery, activeTagIds, hideProjectFolders]);

  async function handleLibraryAdded() {
    await loadLibraries();
  }

  const hasLibraries = selectedLibraryIds.length > 0;

  return (
    <div style={{ display: "flex", height: "100vh", background: "#111", color: "#ccc", fontFamily: "system-ui, sans-serif" }}>
      <AudioElement />
      <Sidebar onLibraryAdded={handleLibraryAdded} />
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {hasLibraries ? (
          <>
            <SearchBar />
            <TagFilterBar />
            <TrackTagEditor />
            <TrackList tracks={tracks} />
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#444", fontSize: 14 }}>
            Add a library to get started
          </div>
        )}
        <Player />
      </div>
    </div>
  );
}
