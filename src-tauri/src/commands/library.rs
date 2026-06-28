use std::path::PathBuf;
use tauri::{AppHandle, Manager};

use crate::{db::DbPool, error::Result, models::Library, scanner};

pub fn restore_asset_scopes(app: &AppHandle, pool: &DbPool) -> Result<()> {
    let conn = pool.get()?;
    let mut stmt = conn.prepare("SELECT root_path FROM libraries")?;
    let paths = stmt
        .query_map([], |row| row.get::<_, String>(0))
        .and_then(|rows| rows.collect::<rusqlite::Result<Vec<_>>>())?;

    let scope = app.asset_protocol_scope();
    for path in paths {
        let _ = scope.allow_directory(&path, true);
    }
    Ok(())
}

#[tauri::command]
pub async fn add_library(
    name: String,
    root_path: String,
    app: AppHandle,
    pool: tauri::State<'_, DbPool>,
) -> std::result::Result<Library, String> {
    let pool = pool.inner().clone();
    tokio::task::spawn_blocking(move || -> Result<Library> {
        let conn = pool.get()?;

        conn.execute(
            "INSERT INTO libraries (name, root_path) VALUES (?1, ?2)
             ON CONFLICT(root_path) DO UPDATE SET name=excluded.name",
            rusqlite::params![name, root_path],
        )?;

        let library: Library = conn.query_row(
            "SELECT id, name, root_path, created_at FROM libraries WHERE root_path = ?1",
            [&root_path],
            |row| {
                Ok(Library {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    root_path: row.get(2)?,
                    created_at: row.get(3)?,
                })
            },
        )?;

        // Allow asset protocol access to this directory
        let _ = app.asset_protocol_scope().allow_directory(&root_path, true);

        // Run the scan (blocking — progress events emitted along the way)
        scanner::scan_library(library.id, &PathBuf::from(&root_path), &pool, &app)?;

        Ok(library)
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn list_libraries(
    pool: tauri::State<'_, DbPool>,
) -> std::result::Result<Vec<Library>, String> {
    let pool = pool.inner().clone();
    tokio::task::spawn_blocking(move || -> Result<Vec<Library>> {
        let conn = pool.get()?;
        let mut stmt = conn.prepare(
            "SELECT id, name, root_path, created_at FROM libraries ORDER BY name",
        )?;
        stmt.query_map([], |row| {
            Ok(Library {
                id: row.get(0)?,
                name: row.get(1)?,
                root_path: row.get(2)?,
                created_at: row.get(3)?,
            })
        })
        .and_then(|rows| rows.collect::<rusqlite::Result<Vec<_>>>())
        .map_err(Into::into)
    })
    .await
    .map_err(|e| e.to_string())?
    .map_err(|e| e.to_string())
}
