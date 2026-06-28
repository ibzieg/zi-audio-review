import { useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { api } from "../../lib/tauri";

export function TagFilterBar() {
  const { allTags, activeTagIds, setActiveTagIds, setAllTags } = useAppStore();
  const [creating, setCreating] = useState(false);
  const [newTagName, setNewTagName] = useState("");

  function toggleTag(tagId: number) {
    setActiveTagIds(
      activeTagIds.includes(tagId)
        ? activeTagIds.filter((id) => id !== tagId)
        : [...activeTagIds, tagId]
    );
  }

  function clearAll() {
    setActiveTagIds([]);
  }

  async function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setCreating(false);
      setNewTagName("");
      return;
    }
    if (e.key !== "Enter" || !newTagName.trim()) return;
    const tag = await api.createTag(newTagName.trim());
    setAllTags([...allTags, tag].sort((a, b) => a.name.localeCompare(b.name)));
    setNewTagName("");
    setCreating(false);
  }

  if (allTags.length === 0 && !creating) {
    return (
      <div style={containerStyle}>
        <button onClick={() => setCreating(true)} style={addBtnStyle}>
          + create first tag
        </button>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {activeTagIds.length > 0 && (
        <button onClick={clearAll} style={clearBtnStyle}>
          ✕
        </button>
      )}
      {allTags.map((tag) => {
        const active = activeTagIds.includes(tag.id);
        return (
          <button
            key={tag.id}
            onClick={() => toggleTag(tag.id)}
            style={{
              padding: "2px 10px",
              borderRadius: 12,
              fontSize: 12,
              border: `1px solid ${active ? "#4a8fd4" : "#333"}`,
              background: active ? "#1e3a5f" : "#1e1e1e",
              color: active ? "#7ab3e8" : "#666",
              cursor: "pointer",
              flexShrink: 0,
              transition: "background 0.1s, border-color 0.1s",
            }}
          >
            {tag.name}
          </button>
        );
      })}
      {creating ? (
        <input
          autoFocus
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            setCreating(false);
            setNewTagName("");
          }}
          placeholder="tag name…"
          style={{
            background: "#1e1e1e",
            border: "1px solid #4a8fd4",
            borderRadius: 12,
            padding: "2px 10px",
            fontSize: 12,
            color: "#ccc",
            outline: "none",
            width: 100,
            flexShrink: 0,
          }}
        />
      ) : (
        <button onClick={() => setCreating(true)} style={addBtnStyle}>
          + tag
        </button>
      )}
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "5px 12px",
  borderBottom: "1px solid #222",
  background: "#131313",
  flexShrink: 0,
  flexWrap: "wrap",
  minHeight: 34,
};

const addBtnStyle: React.CSSProperties = {
  padding: "2px 10px",
  borderRadius: 12,
  fontSize: 12,
  border: "1px dashed #333",
  background: "transparent",
  color: "#555",
  cursor: "pointer",
  flexShrink: 0,
};

const clearBtnStyle: React.CSSProperties = {
  padding: "2px 8px",
  borderRadius: 12,
  fontSize: 11,
  border: "1px solid #4a3030",
  background: "#2a1a1a",
  color: "#885555",
  cursor: "pointer",
  flexShrink: 0,
};
