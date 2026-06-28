import { useRef } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { columns } from "./columns";
import { useAppStore } from "../../store/useAppStore";
import type { Track } from "../../types";

const ROW_HEIGHT = 36;

interface Props {
  tracks: Track[];
}

export function TrackList({ tracks }: Props) {
  const { selectedTrack, setSelectedTrack, setPlayback } = useAppStore();
  const containerRef = useRef<HTMLDivElement>(null);

  const table = useReactTable({
    data: tracks,
    columns,
    getCoreRowModel: getCoreRowModel(),
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

  function handleRowClick(track: Track) {
    setSelectedTrack(track);
  }

  function handleRowDoubleClick(track: Track) {
    setSelectedTrack(track);
    setPlayback({ track, playing: true, positionSecs: 0 });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid #333", background: "#1a1a1a" }}>
        {table.getHeaderGroups().map((hg) => (
          <div key={hg.id} style={{ display: "flex" }}>
            {hg.headers.map((header) => (
              <div
                key={header.id}
                style={{
                  width: header.getSize(),
                  padding: "6px 8px",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#888",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  flexShrink: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {flexRender(header.column.columnDef.header, header.getContext())}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Virtualized rows */}
      <div ref={containerRef} style={{ flex: 1, overflow: "auto" }}>
        <div style={{ height: totalHeight, position: "relative" }}>
          {paddingTop > 0 && <div style={{ height: paddingTop }} />}
          {virtualRows.map((vr) => {
            const row = rows[vr.index];
            const track = row.original;
            const isSelected = selectedTrack?.id === track.id;
            return (
              <div
                key={row.id}
                style={{
                  display: "flex",
                  height: ROW_HEIGHT,
                  alignItems: "center",
                  background: isSelected ? "#2a4a6e" : vr.index % 2 === 0 ? "#111" : "#141414",
                  cursor: "pointer",
                  borderBottom: "1px solid #1e1e1e",
                }}
                onClick={() => handleRowClick(track)}
                onDoubleClick={() => handleRowDoubleClick(track)}
              >
                {row.getVisibleCells().map((cell) => (
                  <div
                    key={cell.id}
                    style={{
                      width: cell.column.getSize(),
                      padding: "0 8px",
                      fontSize: 13,
                      color: isSelected ? "#fff" : "#ccc",
                      flexShrink: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </div>
                ))}
              </div>
            );
          })}
          {paddingBottom > 0 && <div style={{ height: paddingBottom }} />}
        </div>
      </div>

      <div style={{ padding: "4px 8px", fontSize: 11, color: "#555", borderTop: "1px solid #222" }}>
        {tracks.length.toLocaleString()} tracks
      </div>
    </div>
  );
}
