import { useEffect, useRef } from "react";
import { useAppStore } from "../../store/useAppStore";

export function SearchBar() {
  const { searchQuery, setSearchQuery, hideProjectFolders, setHideProjectFolders } = useAppStore();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearchQuery(value), 200);
  }

  function handleClear() {
    if (inputRef.current) inputRef.current.value = "";
    setSearchQuery("");
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        borderBottom: "1px solid #222",
        background: "#141414",
        flexShrink: 0,
      }}
    >
      <span style={{ color: "#555", fontSize: 13, flexShrink: 0 }}>⌕</span>
      <input
        ref={inputRef}
        type="text"
        placeholder="Search tracks…"
        defaultValue={searchQuery}
        onChange={handleChange}
        style={{
          flex: 1,
          background: "transparent",
          border: "none",
          outline: "none",
          color: "#ccc",
          fontSize: 13,
          fontFamily: "inherit",
        }}
      />
      {searchQuery && (
        <button
          onClick={handleClear}
          style={{
            background: "none",
            border: "none",
            color: "#555",
            fontSize: 13,
            cursor: "pointer",
            padding: "0 2px",
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      )}
      <button
        onClick={() => setHideProjectFolders(!hideProjectFolders)}
        title={hideProjectFolders ? "Showing exports only — click to show all files" : "Showing all files — click to hide project folders"}
        style={{
          background: "none",
          border: `1px solid ${hideProjectFolders ? "#333" : "#4a8fd4"}`,
          borderRadius: 4,
          color: hideProjectFolders ? "#444" : "#4a8fd4",
          fontSize: 11,
          cursor: "pointer",
          padding: "2px 7px",
          flexShrink: 0,
          letterSpacing: "0.02em",
        }}
      >
        {hideProjectFolders ? "exports" : "all files"}
      </button>
    </div>
  );
}
