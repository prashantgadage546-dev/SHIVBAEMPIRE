// =============================================================
// SHIVBAEMPIRE — Real Persistent Database Engine
// MySQL Pool (Production) + Persistent SQLite File (Local/Dev)
// =============================================================
const mysql = require('mysql2/promise');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

let useSQLite = false;
let sqliteDb = null;

const dbConfig = {
  host: process.env.DB_HOST || 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
  port: parseInt(process.env.DB_PORT) || 4000,
  database: process.env.DB_NAME || 'shivbaempire',
  user: process.env.DB_USER || '2sEaQneLB27DyZf.root',
  password: process.env.DB_PASSWORD || '4YLchPbelL9eVQ7Q',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  ssl: (process.env.DB_SSL === 'true' || (process.env.DB_HOST && process.env.DB_HOST.includes('tidbcloud.com')))
    ? { minVersion: 'TLSv1.2', rejectUnauthorized: false }
    : undefined,
  timezone: '+05:30',
  charset: 'utf8mb4',
};

const realPool = mysql.createPool(dbConfig);

const sqlitePath = path.join(__dirname, '../../../database/shivbaempire.sqlite');

function initSQLite() {
  const dbDir = path.dirname(sqlitePath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  sqliteDb = new sqlite3.Database(sqlitePath);

  sqliteDb.serialize(() => {
    // Enable WAL mode for performance
    sqliteDb.run('PRAGMA journal_mode = WAL;');

    // 1. Roles
    sqliteDb.run(`CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 2. Users
    sqliteDb.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role_id INTEGER NOT NULL,
      full_name TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      email TEXT UNIQUE,
      mobile TEXT,
      password_hash TEXT NOT NULL,
      status TEXT DEFAULT 'ACTIVE',
      last_login_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 3. Events
    sqliteDb.run(`CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      event_date DATE,
      end_date DATE,
      location TEXT,
      status TEXT DEFAULT 'UPCOMING',
      is_active INTEGER DEFAULT 0,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 4. Donors
    sqliteDb.run(`CREATE TABLE IF NOT EXISTS donors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      donor_code TEXT NOT NULL UNIQUE,
      full_name TEXT NOT NULL,
      mobile TEXT NOT NULL,
      email TEXT,
      village_name TEXT,
      address TEXT,
      expected_donation REAL DEFAULT 0.00,
      total_paid REAL DEFAULT 0.00,
      pending_amount REAL DEFAULT 0.00,
      status TEXT DEFAULT 'PENDING',
      notes TEXT,
      event_id INTEGER NOT NULL,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 5. Receipts
    sqliteDb.run(`CREATE TABLE IF NOT EXISTS receipts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_number TEXT NOT NULL UNIQUE,
      event_id INTEGER NOT NULL,
      donor_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      amount_in_words TEXT NOT NULL,
      payment_mode TEXT NOT NULL,
      transaction_id TEXT,
      collection_date DATE NOT NULL,
      collector_id INTEGER NOT NULL,
      qr_code_data TEXT,
      notes TEXT,
      is_cancelled INTEGER DEFAULT 0,
      cancelled_at DATETIME,
      cancelled_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 6. Collections
    sqliteDb.run(`CREATE TABLE IF NOT EXISTS collections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_id INTEGER NOT NULL,
      donor_id INTEGER NOT NULL,
      event_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      payment_mode TEXT NOT NULL,
      transaction_id TEXT,
      collection_date DATE NOT NULL,
      collector_id INTEGER NOT NULL,
      notes TEXT,
      is_cancelled INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 7. Expenses
    sqliteDb.run(`CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_mode TEXT NOT NULL,
      expense_date DATE NOT NULL,
      paid_to TEXT,
      bill_number TEXT,
      notes TEXT,
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 8. Targets
    sqliteDb.run(`CREATE TABLE IF NOT EXISTS targets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      target_amount REAL NOT NULL,
      start_date DATE,
      end_date DATE,
      description TEXT,
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 9. Receipt Sequences
    sqliteDb.run(`CREATE TABLE IF NOT EXISTS receipt_sequences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      year INTEGER NOT NULL,
      last_number INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 10. Settings
    sqliteDb.run(`CREATE TABLE IF NOT EXISTS settings (
      setting_key TEXT PRIMARY KEY,
      setting_value TEXT NOT NULL,
      description TEXT,
      updated_by INTEGER,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 11. Activity Logs
    sqliteDb.run(`CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      user_name TEXT,
      action TEXT NOT NULL,
      module TEXT NOT NULL,
      record_id INTEGER,
      old_data TEXT,
      new_data TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 12. Villages
    sqliteDb.run(`CREATE TABLE IF NOT EXISTS villages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      taluka TEXT,
      district TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Insert Default Data if users table is empty
    sqliteDb.get("SELECT COUNT(*) as count FROM users", (err, row) => {
      if (!row || row.count === 0) {
        seedSQLiteData();
      }
    });
  });
}

function seedSQLiteData() {
  sqliteDb.serialize(() => {
    // Roles
    sqliteDb.run("INSERT OR IGNORE INTO roles (id, name, description) VALUES (1, 'ADMIN', 'Full system control'), (2, 'COLLECTOR', 'Collection entry and view access');");

    // Users (Default Collectors: Prashant Gadage & Swapnil Gadage)
    sqliteDb.run(`INSERT OR IGNORE INTO users (id, role_id, full_name, username, email, mobile, password_hash, status) VALUES
      (1, 2, 'Prashant Gadage', 'prashant.gadage', 'prashant@shivbaempire.com', '9876543210', '$2b$10$HVlqaF8p8AFVhEjdvVRHTOhTFljfNxKecciUopO4EkhRO3MHQsZsi', 'ACTIVE'),
      (2, 2, 'Swapnil Gadage', 'swapnil.gadage', 'swapnil@shivbaempire.com', '9876543211', '$2b$10$HVlqaF8p8AFVhEjdvVRHTOhTFljfNxKecciUopO4EkhRO3MHQsZsi', 'ACTIVE');`);

    // Events
    sqliteDb.run(`INSERT OR IGNORE INTO events (id, name, description, event_date, end_date, location, status, is_active, created_by) VALUES
      (1, 'Yatra 2026', 'Annual Yatra 2026 - Shivba Tarun Mitra Mandal', '2026-11-15', '2026-11-17', 'Trimbakeshwar, Nashik', 'ACTIVE', 1, 1);`);

    // Target
    sqliteDb.run(`INSERT OR IGNORE INTO targets (id, event_id, target_amount, start_date, end_date, description, created_by) VALUES
      (1, 1, 500000.00, '2026-01-01', '2026-11-15', 'Total collection target for Yatra 2026', 1);`);

    // Receipt Sequence (Starts from 0 for fresh new entries)
    sqliteDb.run(`INSERT OR IGNORE INTO receipt_sequences (id, event_id, year, last_number) VALUES (1, 1, 2026, 0);`);

    // Settings
    sqliteDb.run(`INSERT OR IGNORE INTO settings (setting_key, setting_value) VALUES
      ('org_name', 'Shivba Tarun Mitra Mandal'),
      ('default_event_id', '1'),
      ('receipt_prefix', 'YAT'),
      ('contact_email', 'contact@shivbaempire.com'),
      ('contact_phone', '9876543210');`);

    // Villages
    sqliteDb.run(`INSERT OR IGNORE INTO villages (id, name) VALUES (1, 'Pune'), (2, 'Mumbai'), (3, 'Nashik'), (4, 'Kolhapur'), (5, 'Satara'), (6, 'Aurangabad');`);
  });
}

// Convert MySQL SQL dialect to SQLite SQL dialect
function adaptQueryToSQLite(sql) {
  let query = sql
    .replace(/FOR UPDATE/gi, '')
    .replace(/ON DUPLICATE KEY UPDATE.*/gi, '')
    .replace(/MONTH\(NOW\(\)\)/gi, "CAST(STRFTIME('%m', 'now') AS INTEGER)")
    .replace(/YEAR\(NOW\(\)\)/gi, "CAST(STRFTIME('%Y', 'now') AS INTEGER)")
    .replace(/MONTH\(([^)]+)\)/gi, "CAST(STRFTIME('%m', $1) AS INTEGER)")
    .replace(/YEAR\(([^)]+)\)/gi, "CAST(STRFTIME('%Y', $1) AS INTEGER)")
    .replace(/CURDATE\(\)/gi, "DATE('now')")
    .replace(/NOW\(\)/gi, "DATETIME('now')")
    .replace(/DATE_FORMAT\(([^,]+),\s*'%b %Y'\)/gi, "STRFTIME('%Y-%m', $1)")
    .replace(/DATE_FORMAT\(([^,]+),\s*'%Y-%m-%d'\)/gi, "DATE($1)");

  return query;
}

// Test MySQL Connection on startup
const testConnection = async () => {
  try {
    const connection = await realPool.getConnection();
    logger.info('✅ MySQL database connected successfully.');
    connection.release();
  } catch (error) {
    useSQLite = true;
    logger.warn('ℹ️ Local MySQL server not active. Operating on persistent local SQLite database file: ' + sqlitePath);
    initSQLite();
  }
};

// Smart Database Pool proxy matching mysql2 Promise API
const pool = {
  execute: (sql, params = []) => {
    if (!useSQLite) {
      let finalSql = sql;
      let finalParams = [...params];

      // Fix TiDB / MySQL prepared statement protocol error with LIMIT ? OFFSET ?
      if (/LIMIT\s+\?\s+OFFSET\s+\?/i.test(finalSql) && finalParams.length >= 2) {
        const offsetVal = Math.max(0, parseInt(finalParams.pop()) || 0);
        const limitVal = Math.max(1, parseInt(finalParams.pop()) || 20);
        finalSql = finalSql.replace(/LIMIT\s+\?\s+OFFSET\s+\?/i, `LIMIT ${limitVal} OFFSET ${offsetVal}`);
      } else if (/LIMIT\s+\?/i.test(finalSql) && finalParams.length >= 1) {
        const limitVal = Math.max(1, parseInt(finalParams.pop()) || 20);
        finalSql = finalSql.replace(/LIMIT\s+\?/i, `LIMIT ${limitVal}`);
      }

      return realPool.execute(finalSql, finalParams).catch(err => {
        if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
          useSQLite = true;
          initSQLite();
          return pool.execute(sql, params);
        }
        throw err;
      });
    }

    return new Promise((resolve, reject) => {
      const adaptedSql = adaptQueryToSQLite(sql);
      const isSelect = /^\s*SELECT/i.test(adaptedSql);

      if (isSelect) {
        sqliteDb.all(adaptedSql, params, (err, rows) => {
          if (err) return reject(err);
          // Auto alias COUNT(*) or SUM() results to match MySQL result structures
          const normalized = (rows || []).map(row => {
            if (!row || typeof row !== 'object') return row;
            const res = { ...row };
            for (const k of Object.keys(row)) {
              if (k.toLowerCase().includes('count(')) {
                res.total = row[k];
                res.cnt = row[k];
                res.total_collections = row[k];
                res.donor_count = row[k];
                res.donors_added = row[k];
              }
              if (k.toLowerCase().includes('sum(')) {
                if (res.total_collection === undefined) res.total_collection = row[k];
                if (res.total === undefined) res.total = row[k];
                if (res.total_amount === undefined) res.total_amount = row[k];
                if (res.total_collected === undefined) res.total_collected = row[k];
                if (res.total_expenses === undefined) res.total_expenses = row[k];
              }
            }
            return res;
          });
          resolve([normalized, []]);
        });
      } else {
        sqliteDb.run(adaptedSql, params, function (err) {
          if (err) return reject(err);
          resolve([{ insertId: this.lastID, affectedRows: this.changes }, []]);
        });
      }
    });
  },

  getConnection: async () => {
    if (!useSQLite) {
      try {
        return await realPool.getConnection();
      } catch {
        useSQLite = true;
        initSQLite();
      }
    }
    return {
      beginTransaction: (cb) => new Promise(res => sqliteDb.run('BEGIN TRANSACTION', () => res())),
      commit: (cb) => new Promise(res => sqliteDb.run('COMMIT', () => res())),
      rollback: (cb) => new Promise(res => sqliteDb.run('ROLLBACK', () => res())),
      release: () => {},
      execute: (sql, params) => pool.execute(sql, params),
    };
  }
};

module.exports = { pool, testConnection };
