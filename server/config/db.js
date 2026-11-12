const mysql = require('mysql2/promise');
const sqlite3 = require('sqlite3').verbose();
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config();

let dbMode = 'mysql'; // 'mysql' or 'sqlite'
let mysqlPool = null;
let sqliteDb = null;

// Initialize MySQL pool
mysqlPool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'civiccare_db',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Initialize SQLite fallback database
const sqlitePath = path.join(__dirname, '../../database/civiccare.sqlite');

function initSqlite() {
  dbMode = 'sqlite';
  sqliteDb = new sqlite3.Database(sqlitePath);
}

// Convert MySQL SQL dialect query to SQLite dialect if needed
function translateQuery(sql) {
  if (dbMode !== 'sqlite') return sql;
  return sql
    .replace(/NOW\(\)\s*\+\s*INTERVAL\s*(\d+)\s*MINUTE/gi, "datetime('now', '+$1 minutes')")
    .replace(/NOW\(\)\s*-\s*INTERVAL\s*(\d+)\s*DAY/gi, "datetime('now', '-$1 days')")
    .replace(/NOW\(\)\s*-\s*INTERVAL\s*(\d+)\s*HOUR/gi, "datetime('now', '-$1 hours')")
    .replace(/NOW\(\)\s*-\s*INTERVAL\s*(\d+)\s*MONTH/gi, "datetime('now', '-$1 months')")
    .replace(/NOW\(\)/gi, "datetime('now')")
    .replace(/ON DUPLICATE KEY UPDATE.*/gi, '')
    .replace(/AUTO_INCREMENT/gi, 'AUTOINCREMENT')
    .replace(/ENGINE=InnoDB/gi, '')
    .replace(/DEFAULT CHARSET=\w+/gi, '');
}

/**
 * Universal Query Executor
 */
async function query(sql, params = []) {
  if (dbMode === 'mysql') {
    try {
      const [results] = await mysqlPool.query(sql, params);
      return results;
    } catch (error) {
      // If connection refused/denied, fallback to SQLite
      if (error.code === 'ECONNREFUSED' || error.code === 'ER_ACCESS_DENIED_ERROR') {
        console.warn(`⚠️ MySQL Unavailable (${error.code}). Switching to SQLite mode.`);
        initSqlite();
        return query(sql, params);
      }
      throw error;
    }
  } else {
    // SQLite mode
    return new Promise((resolve, reject) => {
      const sqliteSql = translateQuery(sql);
      const isSelect = sqliteSql.trim().toUpperCase().startsWith('SELECT');
      
      if (isSelect) {
        sqliteDb.all(sqliteSql, params, (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        });
      } else {
        sqliteDb.run(sqliteSql, params, function (err) {
          if (err) return reject(err);
          resolve({ insertId: this.lastID, affectedRows: this.changes });
        });
      }
    });
  }
}

/**
 * Test & verify database connection
 */
async function ensureMigrations() {
  try {
    await query(`ALTER TABLE users ADD COLUMN must_change_password INTEGER DEFAULT 0`);
  } catch (err) {
    // Ignore error if column already exists
  }

  try {
    await query(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id INTEGER PRIMARY KEY AUTO_INCREMENT,
        email VARCHAR(255) NOT NULL,
        otp_code VARCHAR(10) NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } catch (err) {
    // Table already exists
  }
}

async function testConnection() {
  if (process.env.DB_ENGINE && process.env.DB_ENGINE.toLowerCase() === 'sqlite') {
    console.log(`📦 DB_ENGINE is set to SQLite. Using local database: database/civiccare.sqlite`);
    initSqlite();
    await ensureMigrations();
    return true;
  }

  try {
    const conn = await mysqlPool.getConnection();
    console.log(`✅ Connected to MySQL database "${process.env.DB_NAME || 'civiccare_db'}" on ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}`);
    conn.release();
    dbMode = 'mysql';
    await ensureMigrations();
    return true;
  } catch (error) {
    console.warn(`⚠️ MySQL Connection note (${error.message}). Using local embedded database engine.`);
    initSqlite();
    await ensureMigrations();
    return true;
  }
}

module.exports = {
  pool: mysqlPool,
  query,
  testConnection,
  getDbMode: () => dbMode
};
