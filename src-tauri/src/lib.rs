mod commands;
mod db;
mod error;
mod models;
mod scanner;

use commands::{library, playlists, tags, tracks};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let db_path = app.path().app_data_dir()?.join("library.db");
            let pool = db::init_pool(&db_path)?;
            library::restore_asset_scopes(app.handle(), &pool)?;
            app.manage(pool);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            library::add_library,
            library::list_libraries,
            tracks::count_tracks,
            tracks::list_tracks,
            tracks::search_tracks,
            tracks::rate_track,
            tags::list_tags,
            tags::list_all_track_tags,
            tags::create_tag,
            tags::assign_tag,
            tags::remove_tag,
            tags::get_track_tags,
            playlists::list_playlists,
            playlists::create_playlist,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
