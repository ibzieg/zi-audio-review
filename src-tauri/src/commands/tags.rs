use crate::{db::DbPool, error::Result, models::{Tag, TrackTagEntry}};

#[tauri::command]
pub async fn list_tags(
    pool: tauri::State<'_, DbPool>,
) -> std::result::Result<Vec<Tag>, String> {
    let pool = pool.inner().clone();
    tokio::task::spawn_blocking(move || -> Result<Vec<Tag>> {
        let conn = pool.get()?;
        let mut stmt = conn.prepare("SELECT id, name FROM tags ORDER BY name")?;
        stmt.query_map([], |row| Ok(Tag { id: row.get(0)?, name: row.get(1)? }))
            .and_then(|rows| rows.collect::<rusqlite::Result<Vec<_>>>())
            .map_err(Into::into)
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_tag(
    name: String,
    pool: tauri::State<'_, DbPool>,
) -> std::result::Result<Tag, String> {
    let pool = pool.inner().clone();
    tokio::task::spawn_blocking(move || -> Result<Tag> {
        let conn = pool.get()?;
        conn.execute("INSERT OR IGNORE INTO tags (name) VALUES (?1)", [&name])?;
        let id = conn.query_row(
            "SELECT id FROM tags WHERE name = ?1",
            [&name],
            |row| row.get(0),
        )?;
        Ok(Tag { id, name })
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn assign_tag(
    track_id: i64,
    tag_id: i64,
    pool: tauri::State<'_, DbPool>,
) -> std::result::Result<(), String> {
    let pool = pool.inner().clone();
    tokio::task::spawn_blocking(move || -> Result<()> {
        let conn = pool.get()?;
        conn.execute(
            "INSERT OR IGNORE INTO track_tags (track_id, tag_id) VALUES (?1, ?2)",
            [track_id, tag_id],
        )?;
        Ok(())
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn remove_tag(
    track_id: i64,
    tag_id: i64,
    pool: tauri::State<'_, DbPool>,
) -> std::result::Result<(), String> {
    let pool = pool.inner().clone();
    tokio::task::spawn_blocking(move || -> Result<()> {
        let conn = pool.get()?;
        conn.execute(
            "DELETE FROM track_tags WHERE track_id = ?1 AND tag_id = ?2",
            [track_id, tag_id],
        )?;
        Ok(())
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_all_track_tags(
    pool: tauri::State<'_, DbPool>,
) -> std::result::Result<Vec<TrackTagEntry>, String> {
    let pool = pool.inner().clone();
    tokio::task::spawn_blocking(move || -> Result<Vec<TrackTagEntry>> {
        let conn = pool.get()?;
        let mut stmt = conn.prepare(
            "SELECT tt.track_id, t.id, t.name
             FROM track_tags tt
             JOIN tags t ON t.id = tt.tag_id
             ORDER BY tt.track_id, t.name",
        )?;
        stmt.query_map([], |row| {
            Ok(TrackTagEntry {
                track_id: row.get(0)?,
                tag_id: row.get(1)?,
                tag_name: row.get(2)?,
            })
        })
        .and_then(|rows| rows.collect::<rusqlite::Result<Vec<_>>>())
        .map_err(Into::into)
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_track_tags(
    track_id: i64,
    pool: tauri::State<'_, DbPool>,
) -> std::result::Result<Vec<Tag>, String> {
    let pool = pool.inner().clone();
    tokio::task::spawn_blocking(move || -> Result<Vec<Tag>> {
        let conn = pool.get()?;
        let mut stmt = conn.prepare(
            "SELECT t.id, t.name FROM tags t
             JOIN track_tags tt ON t.id = tt.tag_id
             WHERE tt.track_id = ?1
             ORDER BY t.name",
        )?;
        stmt.query_map([track_id], |row| Ok(Tag { id: row.get(0)?, name: row.get(1)? }))
            .and_then(|rows| rows.collect::<rusqlite::Result<Vec<_>>>())
            .map_err(Into::into)
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| e.to_string())
}
