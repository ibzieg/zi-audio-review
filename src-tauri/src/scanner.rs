use std::path::Path;
use lofty::{file::{AudioFile, TaggedFileExt}, probe::Probe, tag::Accessor};
use tauri::{AppHandle, Emitter};
use walkdir::WalkDir;

use crate::{db::DbPool, error::Result, models::ScanProgress};

const AUDIO_EXTENSIONS: &[&str] = &["wav", "mp3", "flac", "aif", "aiff", "ogg", "w64"];

pub fn scan_library(
    library_id: i64,
    root_path: &Path,
    pool: &DbPool,
    app: &AppHandle,
) -> Result<usize> {
    let entries: Vec<_> = WalkDir::new(root_path)
        .follow_links(false)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| {
            e.file_type().is_file()
                && e.file_name()
                    .to_str()
                    .map(|n| !n.starts_with('.'))
                    .unwrap_or(false)
                && e.path()
                    .extension()
                    .and_then(|x| x.to_str())
                    .map(|x| AUDIO_EXTENSIONS.contains(&x.to_lowercase().as_str()))
                    .unwrap_or(false)
        })
        .collect();

    let total = entries.len();
    let conn = pool.get()?;

    for (i, entry) in entries.iter().enumerate() {
        let path = entry.path();
        let relative = path.strip_prefix(root_path).unwrap_or(path);
        let components: Vec<_> = relative.components().collect();

        let path_segment_1 = components
            .first()
            .and_then(|c| c.as_os_str().to_str())
            .filter(|s| path.file_name().and_then(|f| f.to_str()) != Some(s))
            .map(String::from);

        let path_segment_2 = if components.len() > 2 {
            components
                .get(1)
                .and_then(|c| c.as_os_str().to_str())
                .map(String::from)
        } else {
            None
        };

        let filename = path
            .file_name()
            .and_then(|f| f.to_str())
            .unwrap_or("")
            .to_string();

        let file_size_bytes = path.metadata().ok().map(|m| m.len() as i64);
        let last_modified = path.metadata().ok().and_then(|m| {
            m.modified().ok().map(|t| {
                let secs = t
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_secs();
                format_unix_ts(secs)
            })
        });

        // Read audio metadata — most DAW WAV exports have none, that's fine
        let (title, artist, album, duration_secs, sample_rate, channels, bit_depth) =
            read_metadata(path);

        conn.execute(
            "INSERT INTO tracks (
                library_id, file_path, relative_path, path_segment_1, path_segment_2,
                filename, title, artist, album, duration_secs, sample_rate, channels,
                bit_depth, file_size_bytes, last_modified
             ) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15)
             ON CONFLICT(file_path) DO UPDATE SET
                relative_path=excluded.relative_path,
                path_segment_1=excluded.path_segment_1,
                path_segment_2=excluded.path_segment_2,
                filename=excluded.filename,
                title=excluded.title,
                artist=excluded.artist,
                album=excluded.album,
                duration_secs=excluded.duration_secs,
                sample_rate=excluded.sample_rate,
                channels=excluded.channels,
                bit_depth=excluded.bit_depth,
                file_size_bytes=excluded.file_size_bytes,
                last_modified=excluded.last_modified,
                indexed_at=datetime('now')",
            rusqlite::params![
                library_id,
                path.to_string_lossy().as_ref(),
                relative.to_string_lossy().as_ref(),
                path_segment_1,
                path_segment_2,
                filename,
                title,
                artist,
                album,
                duration_secs,
                sample_rate,
                channels,
                bit_depth,
                file_size_bytes,
                last_modified,
            ],
        )?;

        if i % 50 == 0 || i == total - 1 {
            let _ = app.emit(
                "scan:progress",
                ScanProgress {
                    current: i + 1,
                    total,
                    current_path: filename.clone(),
                },
            );
        }
    }

    Ok(total)
}

fn read_metadata(
    path: &Path,
) -> (
    Option<String>,
    Option<String>,
    Option<String>,
    Option<f64>,
    Option<i64>,
    Option<i64>,
    Option<i64>,
) {
    let Ok(tagged) = Probe::open(path).and_then(|p| p.read()) else {
        return (None, None, None, None, None, None, None);
    };

    let (title, artist, album) = if let Some(tag) = tagged.primary_tag() {
        (
            tag.title().map(|s| s.to_string()),
            tag.artist().map(|s| s.to_string()),
            tag.album().map(|s| s.to_string()),
        )
    } else {
        (None, None, None)
    };

    let props = tagged.properties();
    let duration_secs = Some(props.duration().as_secs_f64());
    let sample_rate = props.sample_rate().map(|v| v as i64);
    let channels = props.channels().map(|v| v as i64);
    let bit_depth = props.bit_depth().map(|v| v as i64);

    (title, artist, album, duration_secs, sample_rate, channels, bit_depth)
}

fn format_unix_ts(secs: u64) -> String {
    // Simple ISO-ish timestamp without pulling in chrono
    let s = secs;
    let min = s / 60;
    let hour = min / 60;
    let day_total = hour / 24;
    let sec = s % 60;
    let min = min % 60;
    let hour = hour % 24;
    // Approximate date (good enough for change detection, not display)
    let days_since_epoch = day_total;
    let year = 1970 + days_since_epoch / 365;
    let day_of_year = days_since_epoch % 365;
    let month = day_of_year / 30 + 1;
    let day = day_of_year % 30 + 1;
    format!("{year:04}-{month:02}-{day:02}T{hour:02}:{min:02}:{sec:02}Z")
}
