import { useEffect, useRef, useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { api } from "../../lib/tauri";
import type { Tag } from "../../types";

export function TrackTagEditor() {
  const { selectedTrack, allTags, setAllTags } = useAppStore();
  const [trackTags, setTrackTags] = useState<Tag[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!selectedTrack) {
      setTrackTags([]);
      return;
    }
    api.getTrackTags(selectedTrack.id).then(setTrackTags);
  }, [selectedTrack?.id]);

  if (!selectedTrack) return null;

  const assignedIds = new Set(trackTags.map((t) => t.id));
  const suggestions = allTags.filter(
    (t) =>
      !assignedIds.has(t.id) &&
      t.name.toLowerCase().includes(inputValue.toLowerCase())
  );
  const canCreate =
    inputValue.trim().length > 0 &&
    !allTags.some(
      (t) => t.name.toLowerCase() === inputValue.trim().toLowerCase()
    );

  async function assign(tag: Tag) {
    if (!selectedTrack) return;
    await api.assignTag(selectedTrack.id, tag.id);
    setTrackTags((prev) =>
      [...prev, tag].sort((a, b) => a.name.localeCompare(b.name))
    );
    setInputValue("");
    setShowDropdown(false);
  }

  async function createAndAssign() {
    const name = inputValue.trim();
    if (!name) return;
    const existing = allTags.find(
      (t) => t.name.toLowerCase() === name.toLowerCase()
    );
    if (existing) {
      await assign(existing);
      return;
    }
    const tag = await api.createTag(name);
    setAllTags([...allTags, tag].sort((a, b) => a.name.localeCompare(b.name)));
    await assign(tag);
  }

  async function removeTag(tag: Tag) {
    if (!selectedTrack) return;
    await api.removeTag(selectedTrack.id, tag.id);
    setTrackTags((prev) => prev.filter((t) => t.id !== tag.id));
  }

  return (
    <div
      style={{
        padding: "5px 12px",
        borderBottom: "1px solid #222",
        background: "#121212",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: 6,
        flexWrap: "wrap",
        minHeight: 34,
      }}
    >
      <span style={{ fontSize: 11, color: "#3a3a3a", flexShrink: 0, userSelect: "none" }}>
        ↳
      </span>

      {trackTags.length === 0 && (
        <span style={{ fontSize: 12, color: "#3a3a3a", flexShrink: 0 }}>
          no tags
        </span>
      )}

      {trackTags.map((tag) => (
        <span
          key={tag.id}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "1px 8px 1px 10px",
            borderRadius: 12,
            fontSize: 12,
            background: "#1e3a5f",
            border: "1px solid #2a5080",
            color: "#7ab3e8",
            flexShrink: 0,
          }}
        >
          {tag.name}
          <button
            onClick={() => removeTag(tag)}
            style={{
              background: "none",
              border: "none",
              color: "#3a6090",
              cursor: "pointer",
              padding: "0 0 0 2px",
              fontSize: 11,
              lineHeight: 1,
              display: "flex",
              alignItems: "center",
            }}
          >
            ✕
          </button>
        </span>
      ))}

      {/* Add tag input */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        <input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
          onKeyDown={async (e) => {
            if (e.key === "Enter") await createAndAssign();
            if (e.key === "Escape") {
              setInputValue("");
              setShowDropdown(false);
              inputRef.current?.blur();
            }
          }}
          placeholder="add tag…"
          style={{
            background: "transparent",
            border: "1px dashed #2a2a2a",
            borderRadius: 12,
            padding: "2px 10px",
            fontSize: 12,
            color: "#666",
            outline: "none",
            width: 90,
            fontFamily: "inherit",
          }}
        />

        {showDropdown && (suggestions.length > 0 || canCreate) && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              background: "#1a1a1a",
              border: "1px solid #2a2a2a",
              borderRadius: 6,
              zIndex: 200,
              minWidth: 140,
              maxHeight: 200,
              overflow: "auto",
              boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
            }}
          >
            {suggestions.map((tag) => (
              <div
                key={tag.id}
                onMouseDown={() => assign(tag)}
                style={dropdownItemStyle}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#222")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                {tag.name}
              </div>
            ))}
            {canCreate && (
              <div
                onMouseDown={createAndAssign}
                style={{ ...dropdownItemStyle, color: "#4a8fd4" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#222")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                + create "{inputValue.trim()}"
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const dropdownItemStyle: React.CSSProperties = {
  padding: "7px 12px",
  fontSize: 13,
  color: "#bbb",
  cursor: "pointer",
  background: "transparent",
  transition: "background 0.1s",
};
