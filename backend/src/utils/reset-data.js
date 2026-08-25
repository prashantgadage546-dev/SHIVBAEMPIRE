// =============================================================
// SHIVBAEMPIRE — Data Reset Script
// Clears: collections, receipts, donors, expenses, activity_logs
// Keeps: users, roles, settings, villages, events
// Run: node src/utils/reset-data.js
// =============================================================
require('dotenv').config({ path: require('path').join(__dirname, '../../../../.env') });

const mysql = require('mysql2/promise');

async function resetData() {
  const connection = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
    port:     parseInt(process.env.DB_PORT) || 4000,
    user:     process.env.DB_USER     || '2sEaQneLB27DyZf.root',
    password: process.env.DB_PASSWORD || '4YLchPbelL9eVQ7Q',
    database: process.env.DB_NAME     || 'shivbaempire',
    ssl:      { minVersion: 'TLSv1.2', rejectUnauthorized: false },
    multipleStatements: true,
  });

  console.log('✅ Database connected...');
  console.log('🗑️  Clearing all data...\n');

  await connection.execute('SET FOREIGN_KEY_CHECKS = 0');

  // 1. Collections delete
  const [c] = await connection.execute('DELETE FROM collections');
  console.log(`✅ Collections deleted: ${c.affectedRows} rows`);

  // 2. Receipts delete
  const [r] = await connection.execute('DELETE FROM receipts');
  console.log(`✅ Receipts deleted: ${r.affectedRows} rows`);

  // 3. Donors delete
  const [d] = await connection.execute('DELETE FROM donors');
  console.log(`✅ Donors deleted: ${d.affectedRows} rows`);

  // 4. Expenses delete
  const [e] = await connection.execute('DELETE FROM expenses');
  console.log(`✅ Expenses deleted: ${e.affectedRows} rows`);

  // 5. Activity logs clear
  const [a] = await connection.execute('DELETE FROM activity_logs');
  console.log(`✅ Activity logs deleted: ${a.affectedRows} rows`);

  // 6. Reset receipt sequence counter to 0
  await connection.execute('UPDATE receipt_sequences SET last_number = 0');
  console.log('✅ Receipt sequence reset to 0');

  // 7. Reset auto-increment
  await connection.execute('ALTER TABLE collections AUTO_INCREMENT = 1');
  await connection.execute('ALTER TABLE receipts AUTO_INCREMENT = 1');
  await connection.execute('ALTER TABLE donors AUTO_INCREMENT = 1');
  await connection.execute('ALTER TABLE expenses AUTO_INCREMENT = 1');
  console.log('✅ Auto-increment counters reset to 1');

  await connection.execute('SET FOREIGN_KEY_CHECKS = 1');

  await connection.end();

  console.log('\n🎉 Done! Dashboard will now show 0 and Donors list is empty.');
  console.log('👤 Users, Events, Settings — all kept intact.');
}

resetData().catch(err => {
  console.error('❌ Error:', err.message);
  console.error('Stack:', err.stack);
  process.exit(1);
});
