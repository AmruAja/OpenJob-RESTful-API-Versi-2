require('dotenv').config();
const Redis = require('ioredis');

const redisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  lazyConnect: true,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 1,
  connectTimeout: 3000,
};

if (process.env.REDIS_PASSWORD) {
  redisOptions.password = process.env.REDIS_PASSWORD;
}

const redis = new Redis(redisOptions);

redis.on('error', (err) => {
  // Silent - allow app to run without Redis
  if (process.env.NODE_ENV !== 'test') {
    console.warn('Redis connection error (caching disabled):', err.message);
  }
});

redis.on('connect', () => {
  console.log('Redis connected successfully');
});

const CACHE_TTL = 3600; // 1 hour in seconds

async function getCache(key) {
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

async function setCache(key, value, ttl = CACHE_TTL) {
  try {
    await redis.setex(key, ttl, JSON.stringify(value));
  } catch {
    // ignore
  }
}

async function deleteCache(key) {
  try {
    await redis.del(key);
  } catch {
    // ignore
  }
}

async function deleteCachePattern(pattern) {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch {
    // ignore
  }
}

module.exports = { redis, getCache, setCache, deleteCache, deleteCachePattern };
