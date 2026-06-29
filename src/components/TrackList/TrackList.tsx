import { useRef, useMemo, useEffect, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { createColumns } from "./columns";
import { useAppStore } from "../../store/useAppStore";
import { api } from "../../lib/tauri";
import type { Track, Tag } from "../../types";

const ROW_HEIGHT = 36;

interface Props {
  tracks: Track[];
}

type CtxMenu = { x: number; y: number; track: Track };

export function TrackList({ tracks }: Props) {
  const { selectedTrack, setSelectedTrack, setPlayback, trackTagMap,
          playback, scrollToTrackId, setScrollToTrackId,
          copiedTags, setCopiedTags, setTrackTagMap } = useAppStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null);

  const columns = useMemo(() => createColumns(trackTagMap), [trackTagMap]);

  const table = useReactTable({
    data: tracks,
    columns,
    getCoreRowModel: getCoreRowModel(),
    columnResizeMode: "onChange",
  });

  const rows = table.getRowModel().rows;

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 20,
  });

  const virtualRows = virtualizer.getVirtualItems();
  const totalHeight = virtualizer.getTotalSize();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? totalHeight - virtualRows[virtualRows.length - 1].end
      : 0;

  const totalWidth = table.getCenterTotalSize();

  // Scroll to a track when requested from the Player.
  useEffect(() => {
    if (scrollToTrackId === null) return;
    const idx = tracks.findIndex((t) => t.id === scrollToTrackId);
    if (idx !== -1) virtualizer.scrollToIndex(idx, { align: "center" });
    setScrollToTrackId(null);
  }, [scrollToTrackId]);

  // Close context menu on any click or Escape.
  useEffect(() => {
    if (!ctxMenu) return;
    function close() { setCtxMenu(null); }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") close(); }
    window.addEventListener("click", close);
    window.addEventListener("contextmenu", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("contextmenu", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [ctxMenu]);

  async function handleCopyTags(track: Track) {
    setCopiedTags(trackTagMap[track.id] ?? []);
    setCtxMenu(null);
  }

  async function handlePasteTags(track: Track) {
    setCtxMenu(null);
    if (copiedTags.length === 0) return;
    const existing = new Set((trackTagMap[track.id] ?? []).map((t: Tag) => t.id));
    const toAdd = copiedTags.filter((t) => !existing.has(t.id));
    await Promise.all(toAdd.map((t) => api.assignTag(track.id, t.id)));
    api.listAllTrackTags().then(setTrackTagMap);
  }

  async function handleRevealInFinder(track: Track) {
    setCtxMenu(null);
    await api.revealInFinder(track.filePath);
  }

  function handleRowClick(track: Track) {
    setSelectedTrack(track);
  }

  function handleRowDoubleClick(track: Track) {
    setSelectedTrack(track);
    setPlayback({ track, playing: true, positionSecs: 0 });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden", minHeight: 0 }}>
      {/* Scroll container holds both sticky header and virtual rows */}
      <div ref={containerRef} style={{ flex: 1, overflow: "auto" }}>
        {/* Sticky header */}
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 1,
            background: "#1a1a1a",
            borderBottom: "1px solid #333",
            minWidth: totalWidth,
          }}
        >
          {table.getHeaderGroups().map((hg) => (
            <div key={hg.id} style={{ display: "flex" }}>
              {hg.headers.map((header, i) => {
                const isLast = i === hg.headers.length - 1;
                return (
                  <div
                    key={header.id}
                    style={{
                      ...(isLast
                        ? { flex: 1, minWidth: header.getSize() }
                        : { width: header.getSize(), flexShrink: 0 }),
                      padding: "6px 8px",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#888",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      position: "relative",
                      userSelect: "none",
                    }}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {!isLast && header.column.getCanResize() && (
                      <div
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                        style={{
                          position: "absolute",
                          right: 0,
                          top: 0,
                          height: "100%",
                          width: 4,
                          cursor: "col-resize",
                          background: header.column.getIsResizing() ? "#4a8fd4" : "transparent",
                          touchAction: "none",
                        }}
                        onMouseEnter={(e) => {
                          if (!header.column.getIsResizing())
                            e.currentTarget.style.background = "#2a2a2a";
                        }}
                        onMouseLeave={(e) => {
                          if (!header.column.getIsResizing())
                            e.currentTarget.style.background = "transparent";
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Virtualized rows */}
        <div style={{ height: totalHeight, position: "relative", minWidth: totalWidth }}>
          {paddingTop > 0 && <div style={{ height: paddingTop }} />}
          {virtualRows.map((vr) => {
            const row = rows[vr.index];
            const track = row.original;
            const isSelected = selectedTrack?.id === track.id;
            const isPlaying = playback.track?.id === track.id;
            return (
              <div
                key={row.id}
                style={{
                  display: "flex",
                  position: "relative",
                  height: ROW_HEIGHT,
                  alignItems: "center",
                  background: isSelected ? "#2a4a6e" : isPlaying ? "#0e2318" : vr.index % 2 === 0 ? "#111" : "#141414",
                  boxShadow: isPlaying ? "inset 3px 0 0 #3a9a5c" : undefined,
                  cursor: "pointer",
                  borderBottom: "1px solid #1e1e1e",
                }}
                onClick={() => handleRowClick(track)}
                onDoubleClick={() => handleRowDoubleClick(track)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCtxMenu({
                    x: Math.min(e.clientX, window.innerWidth - 180),
                    y: Math.min(e.clientY, window.innerHeight - 110),
                    track,
                  });
                }}
              >
                {isPlaying && (
                  <div style={{
                    position: "absolute",
                    left: 5,
                    fontSize: 7,
                    color: "#3a9a5c",
                    pointerEvents: "none",
                    lineHeight: 1,
                  }}>▶</div>
                )}
                {row.getVisibleCells().map((cell, i) => {
                  const isLast = i === row.getVisibleCells().length - 1;
                  return (
                    <div
                      key={cell.id}
                      style={{
                        ...(isLast
                          ? { flex: 1, minWidth: cell.column.getSize() }
                          : { width: cell.column.getSize(), flexShrink: 0 }),
                        padding: "0 8px",
                        fontSize: 13,
                        fontWeight: isPlaying ? 600 : 400,
                        color: isSelected ? "#fff" : isPlaying ? "#7ecf9a" : "#ccc",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </div>
                  );
                })}
              </div>
            );
          })}
          {paddingBottom > 0 && <div style={{ height: paddingBottom }} />}
        </div>
      </div>

      <div style={{ padding: "4px 8px", fontSize: 11, color: "#555", borderTop: "1px solid #222", flexShrink: 0 }}>
        {tracks.length.toLocaleString()} tracks
      </div>

      {ctxMenu && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            left: ctxMenu.x,
            top: ctxMenu.y,
            background: "#1e1e1e",
            border: "1px solid #333",
            borderRadius: 6,
            zIndex: 1000,
            minWidth: 168,
            boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
            overflow: "hidden",
          }}
        >
          <CtxItem label="Copy Tags" onClick={() => handleCopyTags(ctxMenu.track)} />
          <CtxItem
            label={copiedTags.length > 0 ? `Paste Tags (${copiedTags.length})` : "Paste Tags"}
            onClick={() => handlePasteTags(ctxMenu.track)}
            disabled={copiedTags.length === 0}
          />
          <div style={{ height: 1, background: "#2a2a2a", margin: "3px 0" }} />
          <CtxItem label="Open in Finder" onClick={() => handleRevealInFinder(ctxMenu.track)} />
        </div>
      )}
    </div>
  );
}

function CtxItem({ label, onClick, disabled = false }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      style={{
        padding: "7px 14px",
        fontSize: 13,
        color: disabled ? "#444" : "#bbb",
        cursor: disabled ? "default" : "pointer",
        userSelect: "none",
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = "#2a2a2a"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      {label}
    </div>
  );
}
