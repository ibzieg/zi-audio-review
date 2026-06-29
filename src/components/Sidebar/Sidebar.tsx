import { useAppStore } from "../../store/useAppStore";
import { api } from "../../lib/tauri";

interface Props {
  onLibraryAdded: () => void;
}

export function Sidebar({ onLibraryAdded }: Props) {
  const { libraries, selectedLibraryIds, setSelectedLibraryIds, scanning, scanStatus, setScanning, setScanStatus } =
    useAppStore();

  function toggleLibrary(id: number) {
    if (selectedLibraryIds.includes(id)) {
      setSelectedLibraryIds(selectedLibraryIds.filter((x) => x !== id));
    } else {
      setSelectedLibraryIds([...selectedLibraryIds, id]);
    }
  }

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

  const allSelected = libraries.length > 0 && selectedLibraryIds.length === libraries.length;

  function toggleAll() {
    if (allSelected) {
      setSelectedLibraryIds([]);
    } else {
      setSelectedLibraryIds(libraries.map((l) => l.id));
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
      <div style={{
        padding: "12px 12px 6px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <span style={{ fontSize: 11, color: "#555", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
          Libraries
        </span>
        {libraries.length > 1 && (
          <button
            onClick={toggleAll}
            style={{
              background: "none",
              border: "none",
              fontSize: 11,
              color: "#444",
              cursor: "pointer",
              padding: 0,
            }}
          >
            {allSelected ? "none" : "all"}
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflow: "auto" }}>
        {libraries.map((lib) => {
          const selected = selectedLibraryIds.includes(lib.id);
          return (
            <div
              key={lib.id}
              onClick={() => toggleLibrary(lib.id)}
              style={{
                padding: "8px 14px",
                fontSize: 13,
                cursor: "pointer",
                color: selected ? "#fff" : "#555",
                background: selected ? "#1a2f4a" : "transparent",
                borderLeft: selected ? "2px solid #4a8fd4" : "2px solid transparent",
                userSelect: "none",
              }}
            >
              {lib.name}
            </div>
          );
        })}
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
