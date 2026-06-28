use crate::{db::DbPool, error::Result, models::Track};

#[tauri::command]
pub async fn count_tracks(
    pool: tauri::State<'_, DbPool>,
) -> std::result::Result<i64, String> {
    let pool = pool.inner().clone();
    tokio::task::spawn_blocking(move || -> Result<i64> {
        let conn = pool.get()?;
        conn.query_row("SELECT COUNT(*) FROM tracks", [], |row| row.get(0))
            .map_err(Into::into)
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_tracks(
    library_id: i64,
    limit: i64,
    offset: i64,
    pool: tauri::State<'_, DbPool>,
) -> std::result::Result<Vec<Track>, String> {
    let pool = pool.inner().clone();
    tokio::task::spawn_blocking(move || -> Result<Vec<Track>> {
        let conn = pool.get()?;
        let mut stmt = conn.prepare(
            "SELECT id, library_id, file_path, relative_path, path_segment_1, path_segment_2,
                    filename, title, artist, album, duration_secs, sample_rate, channels,
                    bit_depth, file_size_bytes, last_modified, indexed_at
             FROM tracks WHERE library_id = ?1
             ORDER BY path_segment_1, path_segment_2, filename
             LIMIT ?2 OFFSET ?3",
        )?;
        stmt.query_map([library_id, limit, offset], track_from_row)
            .and_then(|rows| rows.collect::<rusqlite::Result<Vec<_>>>())
            .map_err(Into::into)
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn search_tracks(
    query: String,
    tag_ids: Vec<i64>,
    pool: tauri::State<'_, DbPool>,
) -> std::result::Result<Vec<Track>, String> {
    let pool = pool.inner().clone();
    tokio::task::spawn_blocking(move || -> Result<Vec<Track>> {
        let conn = pool.get()?;

        // Tags only: use GROUP BY/HAVING to guarantee all tags match across all tracks
        if query.is_empty() && !tag_ids.is_empty() {
            let required = tag_ids.len() as i64;
            let placeholders: String = (1..=tag_ids.len())
                .map(|i| format!("?{i}"))
                .collect::<Vec<_>>()
                .join(",");
            let count_param = tag_ids.len() + 1;
            let sql = format!(
                "SELECT t.id, t.library_id, t.file_path, t.relative_path,
                        t.path_segment_1, t.path_segment_2, t.filename,
                        t.title, t.artist, t.album, t.duration_secs,
                        t.sample_rate, t.channels, t.bit_depth,
                        t.file_size_bytes, t.last_modified, t.indexed_at
                 FROM tracks t
                 JOIN track_tags tt ON tt.track_id = t.id
                 WHERE tt.tag_id IN ({placeholders})
                 GROUP BY t.id
                 HAVING COUNT(DISTINCT tt.tag_id) = ?{count_param}
                 ORDER BY t.path_segment_1, t.path_segment_2, t.filename
                 LIMIT 500"
            );
            let mut params: Vec<i64> = tag_ids.clone();
            params.push(required);
            let mut stmt = conn.prepare(&sql)?;
            return stmt
                .query_map(rusqlite::params_from_iter(params.iter()), track_from_row)
                .and_then(|rows| rows.collect::<rusqlite::Result<Vec<_>>>())
                .map_err(Into::into);
        }

        // Text query (with optional tag post-filter)
        let mut tracks: Vec<Track> = if !query.is_empty() {
            let safe = query.replace('"', "").replace('*', "");
            let fts_query = format!("\"{}\"*", safe);
            let mut stmt = conn.prepare(
                "SELECT id, library_id, file_path, relative_path,
                        path_segment_1, path_segment_2, filename,
                        title, artist, album, duration_secs,
                        sample_rate, channels, bit_depth,
                        file_size_bytes, last_modified, indexed_at
                 FROM tracks
                 WHERE id IN (
                     SELECT rowid FROM tracks_fts WHERE tracks_fts MATCH ?1
                 )
                 ORDER BY path_segment_1, path_segment_2, filename
                 LIMIT 500",
            )?;
            stmt.query_map([fts_query], track_from_row)
                .and_then(|rows| rows.collect::<rusqlite::Result<Vec<_>>>())?
        } else {
            return Ok(vec![]);
        };

        // Post-filter by tags when both text and tags are active
        if !tag_ids.is_empty() {
            let required = tag_ids.len() as i64;
            let placeholders: String = (1..=tag_ids.len())
                .map(|i| format!("?{}", i + 1))
                .collect::<Vec<_>>()
                .join(",");
            let sql = format!(
                "SELECT COUNT(DISTINCT tag_id) FROM track_tags WHERE track_id = ?1 AND tag_id IN ({placeholders})"
            );
            tracks.retain(|t| {
                let mut params: Vec<i64> = vec![t.id];
                params.extend_from_slice(&tag_ids);
                conn.query_row(&sql, rusqlite::params_from_iter(params.iter()), |row| {
                    row.get::<_, i64>(0)
                })
                .map(|count| count == required)
                .unwrap_or(false)
            });
        }

        Ok(tracks)
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| e.to_string())
}

fn track_from_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<Track> {
    Ok(Track {
        id: row.get(0)?,
        library_id: row.get(1)?,
        file_path: row.get(2)?,
        relative_path: row.get(3)?,
        path_segment_1: row.get(4)?,
        path_segment_2: row.get(5)?,
        filename: row.get(6)?,
        title: row.get(7)?,
        artist: row.get(8)?,
        album: row.get(9)?,
        duration_secs: row.get(10)?,
        sample_rate: row.get(11)?,
        channels: row.get(12)?,
        bit_depth: row.get(13)?,
        file_size_bytes: row.get(14)?,
        last_modified: row.get(15)?,
        indexed_at: row.get(16)?,
    })
}
