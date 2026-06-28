use crate::{db::DbPool, error::Result, models::Playlist};

#[tauri::command]
pub async fn list_playlists(
    pool: tauri::State<'_, DbPool>,
) -> std::result::Result<Vec<Playlist>, String> {
    let pool = pool.inner().clone();
    tokio::task::spawn_blocking(move || -> Result<Vec<Playlist>> {
        let conn = pool.get()?;
        let mut stmt =
            conn.prepare("SELECT id, name, created_at FROM playlists ORDER BY name")?;
        stmt.query_map([], |row| {
            Ok(Playlist { id: row.get(0)?, name: row.get(1)?, created_at: row.get(2)? })
        })
        .and_then(|rows| rows.collect::<rusqlite::Result<Vec<_>>>())
        .map_err(Into::into)
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_playlist(
    name: String,
    pool: tauri::State<'_, DbPool>,
) -> std::result::Result<Playlist, String> {
    let pool = pool.inner().clone();
    tokio::task::spawn_blocking(move || -> Result<Playlist> {
        let conn = pool.get()?;
        conn.execute("INSERT INTO playlists (name) VALUES (?1)", [&name])?;
        let id = conn.last_insert_rowid();
        let created_at: String = conn.query_row(
            "SELECT created_at FROM playlists WHERE id = ?1",
            [id],
            |row| row.get(0),
        )?;
        Ok(Playlist { id, name, created_at })
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| e.to_string())
}
