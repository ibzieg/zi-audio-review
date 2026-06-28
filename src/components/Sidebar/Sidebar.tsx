import { useAppStore } from "../../store/useAppStore";
import { api } from "../../lib/tauri";
import type { Library } from "../../types";

interface Props {
  onLibrarySelect: (lib: Library) => void;
  onLibraryAdded: () => void;
}

export function Sidebar({ onLibrarySelect, onLibraryAdded }: Props) {
  const { libraries, selectedLibraryId, scanning, scanStatus, setScanning, setScanStatus } =
    useAppStore();

  async function handleAddLibrary() {
    const path = await api.pickFolder();
    if (!path) return;
    const name = path.split("/").pop() ?? "Library";
    setScanning(true, "Scanning…");
    try {
      await api.addLibrary(name, path);
      setScanStatus("Done");
      onLibraryAdded();
    } catch (e) {
      setScanStatus(`Error: ${e}`);
    } finally {
      setScanning(false);
    }
  }

  return (
    <div
      style={{
        width: 220,
        background: "#161616",
        borderRight: "1px solid #2a2a2a",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}
    >
      <div style={{ padding: "12px 12px 6px", fontSize: 11, color: "#555", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        Libraries
      </div>

      <div style={{ flex: 1, overflow: "auto" }}>
        {libraries.map((lib) => (
          <div
            key={lib.id}
            onClick={() => onLibrarySelect(lib)}
            style={{
              padding: "8px 14px",
              fontSize: 13,
              cursor: "pointer",
              color: selectedLibraryId === lib.id ? "#fff" : "#aaa",
              background: selectedLibraryId === lib.id ? "#1e3a5f" : "transparent",
              borderLeft: selectedLibraryId === lib.id ? "2px solid #4a8fd4" : "2px solid transparent",
            }}
          >
            {lib.name}
          </div>
        ))}
      </div>

      <div style={{ padding: 10, borderTop: "1px solid #222" }}>
        <button
          onClick={handleAddLibrary}
          disabled={scanning}
          style={{
            width: "100%",
            padding: "6px 0",
            fontSize: 12,
            background: "#1e3a5f",
            color: "#7ab3e8",
            border: "1px solid #2a5080",
            borderRadius: 4,
            cursor: scanning ? "default" : "pointer",
          }}
        >
          {scanning ? "Scanning…" : "+ Add library"}
        </button>
        {scanStatus && (
          <div style={{ marginTop: 4, fontSize: 11, color: "#666", textAlign: "center" }}>
            {scanStatus}
          </div>
        )}
      </div>
    </div>
  );
}
