pub mod schema;

use std::path::Path;
use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;

use crate::error::Result;

pub type DbPool = Pool<SqliteConnectionManager>;

pub fn init_pool(db_path: &Path) -> Result<DbPool> {
    if let Some(dir) = db_path.parent() {
        std::fs::create_dir_all(dir)?;
    }
    let manager = SqliteConnectionManager::file(db_path);
    let pool = Pool::builder()
        .max_size(5)
        .build(manager)?;

    let conn = pool.get()?;
    conn.execute_batch(schema::PRAGMAS)?;
    conn.execute_batch(schema::CREATE_TABLES)?;

    Ok(pool)
}
