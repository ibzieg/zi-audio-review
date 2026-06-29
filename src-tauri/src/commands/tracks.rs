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
    library_ids: Vec<i64>,
    limit: i64,
    offset: i64,
    hide_project_folders: bool,
    pool: tauri::State<'_, DbPool>,
) -> std::result::Result<Vec<Track>, String> {
    if library_ids.is_empty() {
        return Ok(vec![]);
    }
    let pool = pool.inner().clone();
    tokio::task::spawn_blocking(move || -> Result<Vec<Track>> {
        let conn = pool.get()?;
        let pf_clause = project_folder_clause(hide_project_folders);
        let lib_clause = library_in_clause(&library_ids, "library_id");
        let lib_count = library_ids.len();
        let limit_p = lib_count + 1;
        let offset_p = lib_count + 2;
        let sql = format!(
            "SELECT id, library_id, file_path, relative_path, path_segment_1, path_segment_2,
                    filename, title, artist, album, duration_secs, sample_rate, channels,
                    bit_depth, file_size_bytes, last_modified, indexed_at
             FROM tracks WHERE{lib_clause}{pf_clause}
             ORDER BY path_segment_1, path_segment_2, filename
             LIMIT ?{limit_p} OFFSET ?{offset_p}"
        );
        let mut params = library_ids.clone();
        params.push(limit);
        params.push(offset);
        let mut stmt = conn.prepare(&sql)?;
        stmt.query_map(rusqlite::params_from_iter(params.iter()), track_from_row)
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
    library_ids: Vec<i64>,
    hide_project_folders: bool,
    pool: tauri::State<'_, DbPool>,
) -> std::result::Result<Vec<Track>, String> {
    if library_ids.is_empty() {
        return Ok(vec![]);
    }
    let pool = pool.inner().clone();
    tokio::task::spawn_blocking(move || -> Result<Vec<Track>> {
        let conn = pool.get()?;
        let pf_clause = project_folder_clause(hide_project_folders);
        // Library IDs are i64 from our own DB — safe to inline as integer literals.
        let lib_list: String = library_ids.iter().map(|id| id.to_string()).collect::<Vec<_>>().join(",");

        // Tags only: GROUP BY / HAVING for AND semantics across all selected libraries
        if query.is_empty() && !tag_ids.is_empty() {
            let required = tag_ids.len() as i64;
            let placeholders: String = (1..=tag_ids.len())
                .map(|i| format!("?{i}"))
                .collect::<Vec<_>>()
                .join(",");
            let count_param = tag_ids.len() + 1;
            let pf_t = pf_clause.replace("path_segment_2", "t.path_segment_2");
            let sql = format!(
                "SELECT t.id, t.library_id, t.file_path, t.relative_path,
                        t.path_segment_1, t.path_segment_2, t.filename,
                        t.title, t.artist, t.album, t.duration_secs,
                        t.sample_rate, t.channels, t.bit_depth,
                        t.file_size_bytes, t.last_modified, t.indexed_at
                 FROM tracks t
                 JOIN track_tags tt ON tt.track_id = t.id
                 WHERE t.library_id IN ({lib_list})
                   AND tt.tag_id IN ({placeholders}){pf_t}
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
            let sql = format!(
                "SELECT id, library_id, file_path, relative_path,
                        path_segment_1, path_segment_2, filename,
                        title, artist, album, duration_secs,
                        sample_rate, channels, bit_depth,
                        file_size_bytes, last_modified, indexed_at
                 FROM tracks
                 WHERE id IN (SELECT rowid FROM tracks_fts WHERE tracks_fts MATCH ?1)
                   AND library_id IN ({lib_list}){pf_clause}
                 ORDER BY path_segment_1, path_segment_2, filename
                 LIMIT 500"
            );
            let mut stmt = conn.prepare(&sql)?;
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

/// Builds `WHERE col IN (?1, ?2, ...)` using positional params starting at 1.
/// Returns a clause beginning with a space, suitable for appending.
fn library_in_clause(ids: &[i64], col: &str) -> String {
    let placeholders = (1..=ids.len()).map(|i| format!("?{i}")).collect::<Vec<_>>().join(",");
    format!(" {col} IN ({placeholders})")
}

/// Returns a SQL AND clause that excludes Ableton "SongName Project" subfolders.
fn project_folder_clause(hide: bool) -> String {
    if hide {
        " AND (path_segment_2 IS NULL OR path_segment_2 NOT LIKE '% Project')".to_string()
    } else {
        String::new()
    }
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
