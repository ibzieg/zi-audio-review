import { useAppStore } from "../../store/useAppStore";

function fmt(secs: number): string {
  if (!isFinite(secs)) return "0:00";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function Player() {
  const { playback, setPlayback, setScrollToTrackId } = useAppStore();
  const { track, playing, positionSecs, durationSecs } = playback;

  const progress = durationSecs > 0 ? positionSecs / durationSecs : 0;

  function togglePlay() {
    if (!track) return;
    setPlayback({ playing: !playing });
  }

  function handleScrub(e: React.ChangeEvent<HTMLInputElement>) {
    const ratio = parseFloat(e.target.value);
    setPlayback({ positionSecs: ratio * durationSecs });
  }

  return (
    <div
      style={{
        height: 64,
        background: "#161616",
        borderTop: "1px solid #2a2a2a",
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "0 16px",
        flexShrink: 0,
      }}
    >
      {/* Play/Pause */}
      <button
        onClick={togglePlay}
        disabled={!track}
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: track ? "#1e3a5f" : "#1a1a1a",
          border: "1px solid #2a5080",
          color: track ? "#7ab3e8" : "#444",
          fontSize: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          cursor: track ? "pointer" : "default",
        }}
      >
        {playing ? "⏸" : "▶"}
      </button>

      {/* Track info — click name to scroll list to this track */}
      <div style={{ width: 200, flexShrink: 0 }}>
        {track ? (
          <>
            <div
              onClick={() => setScrollToTrackId(track.id)}
              title="Click to scroll to this track"
              style={{
                fontSize: 12, color: "#7ecf9a", overflow: "hidden",
                textOverflow: "ellipsis", whiteSpace: "nowrap",
                cursor: "pointer",
              }}
            >
              {track.title ?? track.filename}
            </div>
            <div style={{ fontSize: 11, color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {track.pathSegment1 ?? ""}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 12, color: "#444" }}>No track selected</div>
        )}
      </div>

      {/* Time */}
      <div style={{ fontSize: 11, color: "#555", width: 36, textAlign: "right", flexShrink: 0 }}>
        {fmt(positionSecs)}
      </div>

      {/* Scrub bar */}
      <input
        type="range"
        min={0}
        max={1}
        step={0.001}
        value={progress}
        onChange={handleScrub}
        disabled={!track}
        style={{ flex: 1, ["--progress" as string]: `${progress * 100}%` } as React.CSSProperties}
      />

      {/* Duration */}
      <div style={{ fontSize: 11, color: "#555", width: 36, flexShrink: 0 }}>
        {fmt(durationSecs)}
      </div>

      {/* Format info */}
      {track && (
        <div style={{ fontSize: 11, color: "#444", width: 80, textAlign: "right", flexShrink: 0 }}>
          {track.sampleRate ? `${(track.sampleRate / 1000).toFixed(1)}k` : ""}
          {track.bitDepth ? ` / ${track.bitDepth}b` : ""}
        </div>
      )}
    </div>
  );
}
