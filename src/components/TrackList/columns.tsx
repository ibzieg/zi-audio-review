import { useState } from "react";
import { createColumnHelper } from "@tanstack/react-table";
import type { Track, Tag } from "../../types";
import { tagColor } from "../../lib/tagColor";

const col = createColumnHelper<Track>();

function fmtDuration(secs: number | null): string {
  if (secs == null) return "";
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function RatingCell({
  rating,
  trackId,
  onRate,
}: {
  rating: number | null;
  trackId: number;
  onRate: (trackId: number, rating: number | null) => void;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const preview = hovered ?? rating ?? 0;

  return (
    <div
      style={{ display: "flex", gap: 4, alignItems: "center" }}
      onMouseLeave={() => setHovered(null)}
    >
      {Array.from({ length: 7 }, (_, i) => {
        const dot = i + 1;
        const filled = dot <= preview;
        return (
          <div
            key={dot}
            onMouseEnter={() => setHovered(dot)}
            onClick={(e) => {
              e.stopPropagation();
              onRate(trackId, rating === dot ? null : dot);
            }}
            style={{
              width: 9,
              height: 9,
              borderRadius: "50%",
              flexShrink: 0,
              cursor: "pointer",
              background: filled
                ? hovered !== null
                  ? dot <= hovered ? "#e8b84b" : "#5a5a2a"
                  : "#c9a227"
                : "#2e2e2e",
              transition: "background 0.08s",
            }}
          />
        );
      })}
    </div>
  );
}

export function createColumns(
  trackTagMap: Record<number, Tag[]>,
  onRate: (trackId: number, rating: number | null) => void,
) {
  return [
    col.accessor("pathSegment1", {
      header: "Project",
      size: 180,
      cell: (i) => i.getValue() ?? "",
    }),
    col.accessor("pathSegment2", {
      header: "Folder",
      size: 140,
      cell: (i) => i.getValue() ?? "",
    }),
    col.accessor("filename", {
      header: "File",
      size: 280,
    }),
    col.accessor("durationSecs", {
      header: "Duration",
      size: 80,
      cell: (i) => fmtDuration(i.getValue()),
    }),
    col.accessor("sampleRate", {
      header: "SR",
      size: 70,
      cell: (i) => (i.getValue() ? `${(i.getValue()! / 1000).toFixed(1)}k` : ""),
    }),
    col.accessor("bitDepth", {
      header: "Bit",
      size: 50,
      cell: (i) => i.getValue() ?? "",
    }),
    col.accessor("rating", {
      header: "Rating",
      size: 104,
      cell: (i) => (
        <RatingCell
          rating={i.getValue() ?? null}
          trackId={i.row.original.id}
          onRate={onRate}
        />
      ),
    }),
    col.display({
      id: "tags",
      header: "Tags",
      size: 220,
      cell: ({ row }) => {
        const tags = trackTagMap[row.original.id] ?? [];
        if (tags.length === 0) return null;
        return (
          <div style={{ display: "flex", gap: 4, overflow: "hidden", alignItems: "center" }}>
            {tags.map((tag) => {
              const { bg, border, text } = tagColor(tag.name);
              return (
                <span
                  key={tag.id}
                  style={{
                    padding: "1px 7px",
                    borderRadius: 10,
                    fontSize: 11,
                    background: bg,
                    border: `1px solid ${border}`,
                    color: text,
                    flexShrink: 0,
                    whiteSpace: "nowrap",
                  }}
                >
                  {tag.name}
                </span>
              );
            })}
          </div>
        );
      },
    }),
  ];
}
