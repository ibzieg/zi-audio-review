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

export function createColumns(trackTagMap: Record<number, Tag[]>) {
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
