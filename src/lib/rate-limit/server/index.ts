import type { RedisClusterType } from '@redis/client';
import type { RedisClientType } from 'redis';

/**
 * RATE LIMITER
 * Constant trickle of tockens into bucket WHILE user is using tokens
 */
export class ConstantRefillTokenBucketLimiter {
  public max: number;
  public refillIntervalSeconds: number;

  private name: string;
  private storage: RedisClientType | RedisClusterType;

  constructor({
    name,
    max,
    refillIntervalSeconds,
    storage
  }: {
    name: string;
    max: number;
    refillIntervalSeconds: number;
    storage: RedisClientType | RedisClusterType;
  }) {
    this.max = max;
    this.refillIntervalSeconds = refillIntervalSeconds;
    this.storage = storage;
    this.name = name;
  }

  public async check({ key, cost }: { key: string; cost: number }): Promise<boolean> {
    const redisQuery = `${this.name}:${key}`;
    let bucket = (await this.storage.hGetAll(redisQuery)) as RedisBucket;
    const now = Date.now();

    if (!bucket) {
      await this.storage.hSet(`name:${key}`, {
        count: this.max - cost,
        refilledAt: now
      });
      return true;
    }

    const count = parseInt(bucket.count);
    const refilledAt = parseInt(bucket.refilledAt);
    const refillAmount = Math.floor((now - refilledAt) / (this.refillIntervalSeconds * 1000)); // Time ellapsed over refill interval

    if (refillAmount > 0) {
      await this.storage.hSet(redisQuery, {
        count: Math.min(count + refillAmount, this.max),
        refilledAt: now
      });
    }
    if (count < cost) {
      return false;
    }

    await this.storage.hIncrBy(redisQuery, 'count', -cost);
    return true;
  }
}

type RedisBucket = {
  count: string; // stringified numbers
  refilledAt: string; // stringified numbers
};
