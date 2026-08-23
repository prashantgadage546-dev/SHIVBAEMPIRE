// =============================================================
// SHIVBAEMPIRE — Database Migration Runner
// =============================================================
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const logger = require('./logger');

const MIGRATIONS_DIR = path.join(__dirname, '../../../database/migrations');

async function runMigrations() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'shivba_user',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'shivbaempire',
    multipleStatements: true,
  });

  logger.info('🚀 Running database migrations...');

  // Create migrations tracking table
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      filename VARCHAR(255) NOT NULL,
      executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_migrations_filename (filename)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Get already executed migrations
  const [executed] = await connection.execute('SELECT filename FROM schema_migrations');
  const executedFiles = new Set(executed.map(r => r.filename));

  // Get migration files sorted
  const migrationFiles = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  let count = 0;
  for (const file of migrationFiles) {
    if (executedFiles.has(file)) {
      logger.info(`⏭️  Skipping (already executed): ${file}`);
      continue;
    }

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    logger.info(`⚡ Running migration: ${file}`);

    try {
      await connection.execute(sql);
      await connection.execute('INSERT INTO schema_migrations (filename) VALUES (?)', [file]);
      count++;
      logger.info(`✅ Migration complete: ${file}`);
    } catch (err) {
      logger.error(`❌ Migration failed: ${file}`, err.message);
      await connection.end();
      process.exit(1);
    }
  }

  logger.info(`✅ All migrations complete. Ran ${count} new migration(s).`);
  await connection.end();
}

runMigrations().catch(err => {
  logger.error('Migration error:', err);
  process.exit(1);
});
