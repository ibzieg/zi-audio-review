pub const PRAGMAS: &str = "
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;
PRAGMA synchronous=NORMAL;
";

pub const CREATE_TABLES: &str = "
CREATE TABLE IF NOT EXISTS libraries (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    root_path  TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tracks (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    library_id      INTEGER NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,
    file_path       TEXT NOT NULL UNIQUE,
    checksum        TEXT,
    relative_path   TEXT NOT NULL,
    path_segment_1  TEXT,
    path_segment_2  TEXT,
    filename        TEXT NOT NULL,
    title           TEXT,
    artist          TEXT,
    album           TEXT,
    duration_secs   REAL,
    sample_rate     INTEGER,
    channels        INTEGER,
    bit_depth       INTEGER,
    file_size_bytes INTEGER,
    last_modified   TEXT,
    indexed_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tracks_library   ON tracks(library_id);
CREATE INDEX IF NOT EXISTS idx_tracks_segment1  ON tracks(path_segment_1);
CREATE INDEX IF NOT EXISTS idx_tracks_segment2  ON tracks(path_segment_2);
CREATE INDEX IF NOT EXISTS idx_tracks_filename  ON tracks(filename);

CREATE TABLE IF NOT EXISTS tags (
    id   INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE
);

CREATE TABLE IF NOT EXISTS track_tags (
    track_id   INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    tag_id     INTEGER NOT NULL REFERENCES tags(id)   ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (track_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_track_tags_tag ON track_tags(tag_id);

CREATE TABLE IF NOT EXISTS playlists (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS playlist_tracks (
    playlist_id INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    track_id    INTEGER NOT NULL REFERENCES tracks(id)    ON DELETE CASCADE,
    position    INTEGER NOT NULL,
    PRIMARY KEY (playlist_id, track_id)
);

CREATE INDEX IF NOT EXISTS idx_playlist_tracks_order ON playlist_tracks(playlist_id, position);

CREATE VIRTUAL TABLE IF NOT EXISTS tracks_fts USING fts5(
    title, artist, album, filename, relative_path, path_segment_1, path_segment_2,
    content='tracks',
    content_rowid='id'
);

CREATE TRIGGER IF NOT EXISTS tracks_ai AFTER INSERT ON tracks BEGIN
    INSERT INTO tracks_fts(rowid, title, artist, album, filename,
                           relative_path, path_segment_1, path_segment_2)
    VALUES (new.id, new.title, new.artist, new.album, new.filename,
            new.relative_path, new.path_segment_1, new.path_segment_2);
END;

CREATE TRIGGER IF NOT EXISTS tracks_ad AFTER DELETE ON tracks BEGIN
    INSERT INTO tracks_fts(tracks_fts, rowid, title, artist, album, filename,
                           relative_path, path_segment_1, path_segment_2)
    VALUES ('delete', old.id, old.title, old.artist, old.album, old.filename,
            old.relative_path, old.path_segment_1, old.path_segment_2);
END;

CREATE TRIGGER IF NOT EXISTS tracks_au AFTER UPDATE ON tracks BEGIN
    INSERT INTO tracks_fts(tracks_fts, rowid, title, artist, album, filename,
                           relative_path, path_segment_1, path_segment_2)
    VALUES ('delete', old.id, old.title, old.artist, old.album, old.filename,
            old.relative_path, old.path_segment_1, old.path_segment_2);
    INSERT INTO tracks_fts(rowid, title, artist, album, filename,
                           relative_path, path_segment_1, path_segment_2)
    VALUES (new.id, new.title, new.artist, new.album, new.filename,
            new.relative_path, new.path_segment_1, new.path_segment_2);
END;
";
