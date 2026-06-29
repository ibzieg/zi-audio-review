import { useEffect, useCallback, useRef } from "react";
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
    selectedTrack, playback,
    setLibraries, setSelectedLibraryIds, setTracks, setAllTags, setScanStatus, setTrackTagMap,
    setSelectedTrack, setPlayback,
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

  // Always-fresh snapshot for the keyboard handler (avoids stale closure).
  const kbRef = useRef({ playback, tracks, selectedTrack });
  useEffect(() => { kbRef.current = { playback, tracks, selectedTrack }; });

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

      const { playback, tracks, selectedTrack } = kbRef.current;

      if (e.code === "Space") {
        e.preventDefault();
        if (!playback.track) return;
        setPlayback({ playing: !playback.playing });

      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        if (!playback.track) return;
        setPlayback({ positionSecs: Math.max(0, playback.positionSecs - 10) });

      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        if (!playback.track) return;
        setPlayback({ positionSecs: Math.min(playback.durationSecs || Infinity, playback.positionSecs + 10) });

      } else if (e.code === "ArrowUp" || e.code === "ArrowDown") {
        e.preventDefault();
        if (tracks.length === 0) return;
        const delta = e.code === "ArrowUp" ? -1 : 1;
        const current = playback.track ?? selectedTrack;
        const idx = current ? tracks.findIndex((t) => t.id === current.id) : -1;
        const nextIdx =
          idx === -1
            ? delta > 0 ? 0 : tracks.length - 1
            : Math.max(0, Math.min(tracks.length - 1, idx + delta));
        const next = tracks[nextIdx];
        if (!next || next.id === current?.id) return;
        setSelectedTrack(next);
        setPlayback({ track: next, playing: true, positionSecs: 0 });
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setPlayback, setSelectedTrack]);

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
