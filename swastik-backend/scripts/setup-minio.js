/**
 * Storage Setup / Validation Script
 *
 * Backward-compatible filename kept for existing npm scripts, but this now
 * validates whichever provider is configured: MinIO or Amazon S3.
 *
 * Run: node scripts/setup-minio.js
 */

require('dotenv').config();

const config = require('../config');
const { initializeBucket, storageProvider } = require('../config/minio');

async function setupStorage() {
  console.log(`🚀 Starting ${storageProvider.toUpperCase()} storage setup...\n`);
  console.log(`   Provider: ${storageProvider}`);
  console.log(`   Bucket: ${config.storage.bucketName}`);
  console.log(`   Public URL: ${config.storage.publicUrl}\n`);

  try {
    const ready = await initializeBucket();
    if (!ready) {
      throw new Error('Storage initialization returned false');
    }

    console.log(`✅ ${storageProvider.toUpperCase()} storage is ready`);
  } catch (error) {
    console.error(`\n❌ ${storageProvider.toUpperCase()} storage setup failed:`, error.message);
    console.log('\nTroubleshooting:');
    console.log('  1. Verify the bucket exists or enable STORAGE_AUTO_CREATE_BUCKET=true');
    console.log('  2. Check storage credentials and region in .env');
    console.log('  3. Verify network connectivity to the configured storage endpoint');
    process.exit(1);
  }
}

setupStorage();
