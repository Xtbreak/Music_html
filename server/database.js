const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'music.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('数据库连接失败:', err.message);
  } else {
    console.log('已连接到 SQLite 数据库');
  }
});

function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // 创建用户表
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('admin', 'super_admin')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 创建分类表
      db.run(`
        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 创建歌曲表
      db.run(`
        CREATE TABLE IF NOT EXISTS songs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          category_id INTEGER,
          score_image TEXT,
          content TEXT,
          created_by INTEGER,
          updated_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (category_id) REFERENCES categories(id),
          FOREIGN KEY (created_by) REFERENCES users(id),
          FOREIGN KEY (updated_by) REFERENCES users(id)
        )
      `);

      // 创建索引以优化查询性能
      db.run(`CREATE INDEX IF NOT EXISTS idx_songs_category ON songs(category_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_songs_created ON songs(created_at DESC)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_songs_title ON songs(title)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);

      // 添加 deleted_at 字段（用于软删除/回收站功能）
      db.run(`ALTER TABLE songs ADD COLUMN deleted_at DATETIME DEFAULT NULL`, (err) => {
        // 如果字段已存在会报错，忽略即可
        if (err && !err.message.includes('duplicate column name')) {
          console.error('添加 deleted_at 字段失败:', err.message);
        }
      });

      // 添加回收站索引
      db.run(`CREATE INDEX IF NOT EXISTS idx_songs_deleted ON songs(deleted_at DESC)`, (err) => {
        if (err) reject(err);
        else {
          console.log('数据库表和索引初始化完成');
          resolve();
        }
      });
    });
  });
}

module.exports = { db, initializeDatabase };
