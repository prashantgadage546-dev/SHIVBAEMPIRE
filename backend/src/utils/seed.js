// =============================================================
// SHIVBAEMPIRE — Development Seed Runner
// WARNING: Do NOT run in production
// =============================================================
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const logger = require('./logger');

const SEED_FILE = path.join(__dirname, '../../../database/seed/dev_seed.sql');

async function runSeed() {
  if (process.env.NODE_ENV === 'production') {
    logger.error('🚫 Cannot run seed in production environment!');
    process.exit(1);
  }

  logger.info('🌱 Running development seed...');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'shivba_user',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'shivbaempire',
    multipleStatements: true,
  });

  const sql = fs.readFileSync(SEED_FILE, 'utf8');

  try {
    await connection.execute(sql);
    logger.info('✅ Development seed completed successfully!');
  } catch (err) {
    logger.error('❌ Seed failed:', err.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runSeed().catch(err => {
  logger.error('Seed error:', err);
  process.exit(1);
});
