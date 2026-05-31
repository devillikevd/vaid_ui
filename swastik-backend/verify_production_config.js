const config = require('./config/index');
const Redis = require('ioredis');

console.log('Testing Redis Configuration for Production Environment:');
console.log('---');
console.log('Parsed ioredisUrl from config/index.js:', config.redis.ioredisUrl);
console.log('process.env.REDIS_URL:', process.env.REDIS_URL);
console.log('---');

if (!config.redis.ioredisUrl) {
    console.error('❌ FAIL: Redis URL is completely missing. Check AWS SSM or ECS environment variables.');
    process.exit(1);
}

if (config.redis.ioredisUrl.includes('localhost') || config.redis.ioredisUrl.includes('127.0.0.1')) {
    console.log('⚠️ WARNING: Redis is configured to connect to localhost.');
    console.log('This is ONLY valid if the ECS task runs a Redis sidecar container with hostPort mapping.');
}

console.log('Attempting to initialize ioredis with configured URL...');
const client = new Redis(config.redis.ioredisUrl, {
    maxRetriesPerRequest: 1,
    connectTimeout: 5000
});

client.on('error', (err) => {
    console.error('❌ ERROR: Failed to connect to Redis:', err.message);
    process.exit(1);
});

client.on('ready', () => {
    console.log('✅ SUCCESS: Connected to Redis successfully!');
    client.quit();
    process.exit(0);
});
