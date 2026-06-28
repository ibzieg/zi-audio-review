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
import type { Library } from "./types";
import "./App.css";

export default function App() {
  const {
    libraries, selectedLibraryId, tracks, searchQuery, activeTagIds,
    setLibraries, setSelectedLibraryId, setTracks, setAllTags, setScanStatus,
  } = useAppStore();

  const loadLibraries = useCallback(async () => {
    const libs = await api.listLibraries();
    setLibraries(libs);
    if (libs.length > 0 && selectedLibraryId == null) {
      setSelectedLibraryId(libs[0].id);
    }
  }, [selectedLibraryId, setLibraries, setSelectedLibraryId]);

  const loadTracks = useCallback(async (libraryId: number, query: string, tagIds: number[]) => {
    try {
      if (query.trim() || tagIds.length > 0) {
        const t = await api.searchTracks(query, tagIds);
        setTracks(t);
      } else {
        const t = await api.listTracks(libraryId, 5000, 0);
        setTracks(t);
      }
    } catch (err) {
      setScanStatus(`Search error: ${err}`);
    }
  }, [setTracks, setScanStatus]);

  useEffect(() => {
    loadLibraries();
    api.listTags().then(setAllTags);
  }, []);

  useEffect(() => {
    if (selectedLibraryId != null) {
      loadTracks(selectedLibraryId, searchQuery, activeTagIds);
    }
  }, [selectedLibraryId, searchQuery, activeTagIds]);

  function handleLibrarySelect(lib: Library) {
    setSelectedLibraryId(lib.id);
  }

  async function handleLibraryAdded() {
    await loadLibraries();
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: "#111", color: "#ccc", fontFamily: "system-ui, sans-serif" }}>
      <AudioElement />
      <Sidebar onLibrarySelect={handleLibrarySelect} onLibraryAdded={handleLibraryAdded} />
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {selectedLibraryId != null ? (
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
