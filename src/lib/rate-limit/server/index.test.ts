import { type RedisClientType } from 'redis';
import { vi, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { ConstantRefillTokenBucketLimiter } from '.';
import { redis } from '$lib/db/redis';

describe('ConstantRefillTokenBucketLimiter', () => {
  let redisClient: RedisClientType;
  let limiter: ConstantRefillTokenBucketLimiter;

  beforeAll(async () => {
    redisClient = redis.test as RedisClientType;
    limiter = new ConstantRefillTokenBucketLimiter({
      name: 'test-limiter',
      max: 5,
      refillIntervalSeconds: 1,
      storage: redisClient
    });
  });

  afterEach(async () => {
    await redisClient.flushAll();
  });

  it('should allow requests within the limit', async () => {
    const result1 = await limiter.check({ key: 'user', cost: 1 });
    const result2 = await limiter.check({ key: 'user', cost: 1 });
    const result3 = await limiter.check({ key: 'user', cost: 1 });

    expect(result1).toBeTruthy();
    expect(result2).toBeTruthy();
    expect(result3).toBeTruthy();
  });

  it('should block requests that exceed the limit', async () => {
    const results = [];
    for (let i = 0; i < 8; i++) {
      const check = await limiter.check({ key: 'user', cost: 1 });
      results.push(check);
    }

    expect(results).toEqual([true, true, true, true, true, false, false, false]);
  });

  it('should refill the bucket slowly over time', async () => {
    await limiter.check({ key: 'user', cost: 5 });
    const initialResult = await limiter.check({ key: 'user', cost: 1 });
    expect(initialResult).toBeFalsy();

    const now = Date.now();
    vi.spyOn(Date, 'now').mockImplementation(() => now + 3 * 1000);

    const laterResult = await limiter.check({ key: 'user', cost: 1 });
    expect(laterResult).toBeTruthy();
  });

  it('should not overflow the bucket', async () => {
    await limiter.check({ key: 'user', cost: 5 });
    const initialResult = await limiter.check({ key: 'user', cost: 1 });
    expect(initialResult).toBeFalsy();

    const now = Date.now();
    vi.spyOn(Date, 'now').mockImplementation(() => now + 10 * 1000);

    await limiter.check({ key: 'user', cost: 5 });
    const refillResult = await limiter.check({ key: 'user', cost: 1 });
    expect(refillResult).toBeFalsy();
  });

  it('should handle multiple users independently', async () => {
    const result1 = await limiter.check({ key: 'user1', cost: 5 });
    const result2 = await limiter.check({ key: 'user2', cost: 2 });

    expect(result1).toBeTruthy();
    expect(result2).toBeTruthy();

    const result3 = await limiter.check({ key: 'user1', cost: 1 });
    const result4 = await limiter.check({ key: 'user2', cost: 1 });

    expect(result3).toBeFalsy();
    expect(result4).toBeTruthy();
  });

  it('should reset the bucket for a user', async () => {
    const results1 = [];
    for (let i = 0; i < 8; i++) {
      const check = await limiter.check({ key: 'user', cost: 1 });
      results1.push(check);
    }

    expect(results1).toEqual([true, true, true, true, true, false, false, false]);

    await limiter.reset('user');

    const results2 = [];
    for (let i = 0; i < 8; i++) {
      const check = await limiter.check({ key: 'user', cost: 1 });
      results2.push(check);
    }

    expect(results2).toEqual([true, true, true, true, true, false, false, false]);
  });
});
