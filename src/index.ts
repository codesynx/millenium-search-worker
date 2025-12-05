import 'dotenv/config';
import { syncProducts, syncServices, fullSync } from './sync';

const SYNC_INTERVAL_MINUTES = parseInt(process.env.SYNC_INTERVAL_MINUTES || '5', 10);

console.log('🔍 Meilisearch Sync Worker Starting...');
console.log(`📅 Sync interval: ${SYNC_INTERVAL_MINUTES} minutes`);

// Run initial sync
console.log('🚀 Running initial sync...');
await fullSync();

// Set up periodic sync
setInterval(async () => {
  console.log('\n⏰ Running scheduled sync...');
  try {
    await syncProducts();
    await syncServices();
    console.log('✅ Scheduled sync completed\n');
  } catch (error) {
    console.error('❌ Scheduled sync failed:', error);
  }
}, SYNC_INTERVAL_MINUTES * 60 * 1000);

console.log('✅ Worker is running and will sync every', SYNC_INTERVAL_MINUTES, 'minutes');
console.log('Press Ctrl+C to stop\n');
