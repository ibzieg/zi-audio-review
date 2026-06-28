import { useEffect, useRef } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useAppStore } from "../../store/useAppStore";

export function AudioElement() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const { playback, setPlayback, setScanStatus } = useAppStore();
  // Track intent separately from state to avoid feedback loops
  const shouldPlayRef = useRef(false);

  // When track changes: set src, then play once ready
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;

    if (!playback.track) {
      el.pause();
      el.removeAttribute("src");
      el.load();
      return;
    }

    const url = convertFileSrc(playback.track.filePath);
    console.log("[audio] loading:", url);
    shouldPlayRef.current = playback.playing;
    el.src = url;
    el.load();
    // Play is triggered by onCanPlay below
  }, [playback.track?.id]);

  // When playing state changes (but not track change)
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !playback.track) return;
    shouldPlayRef.current = playback.playing;
    if (playback.playing) {
      el.play().catch((err) => {
        console.error("[audio] play error:", err);
        setScanStatus(`Playback error: ${err.message}`);
      });
    } else {
      el.pause();
    }
  }, [playback.playing]);

  // Seek from scrub bar
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !playback.track) return;
    if (Math.abs(el.currentTime - playback.positionSecs) > 1) {
      el.currentTime = playback.positionSecs;
    }
  }, [playback.positionSecs]);

  return (
    <audio
      ref={audioRef}
      onCanPlay={() => {
        if (shouldPlayRef.current) {
          audioRef.current?.play().catch((err) => {
            console.error("[audio] canplay->play error:", err);
            setScanStatus(`Playback error: ${err.message}`);
          });
        }
      }}
      onTimeUpdate={(e) => {
        const el = e.currentTarget;
        setPlayback({ positionSecs: el.currentTime, durationSecs: el.duration || 0 });
      }}
      onEnded={() => {
        shouldPlayRef.current = false;
        setPlayback({ playing: false, positionSecs: 0 });
      }}
      onPlay={() => setPlayback({ playing: true })}
      onPause={() => setPlayback({ playing: false })}
      onLoadedMetadata={(e) => setPlayback({ durationSecs: e.currentTarget.duration })}
      onError={(e) => {
        const el = e.currentTarget;
        const err = el.error;
        const msg = err ? `MediaError ${err.code}: ${err.message}` : "unknown error";
        console.error("[audio] error:", msg, "src:", el.src);
        setScanStatus(`Audio error: ${msg}`);
      }}
      style={{ display: "none" }}
    />
  );
}
