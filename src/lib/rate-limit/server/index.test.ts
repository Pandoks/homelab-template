/**
 * vi.spy(Date, 'now').mockImplementation(() => now + ...) is used to mimic time skip since
 * the implementation uses Date.now() to detect time span
 */
import { type RedisClientType } from 'redis';
import { vi, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { ConstantRefillTokenBucketLimiter, FixedRefillTokenBucketLimiter, Throttler } from '.';
import { redis } from '$lib/db/redis';
import { resetTestDatabases } from '$lib/test/utils';

describe('ConstantRefillTokenBucketLimiter', () => {
  let redisClient: RedisClientType;
  let limiter: ConstantRefillTokenBucketLimiter;

  beforeAll(async () => {
    redisClient = redis.test?.instance as RedisClientType;
    limiter = new ConstantRefillTokenBucketLimiter({
      name: 'test-limiter',
      max: 5,
      refillIntervalSeconds: 1,
      storage: redisClient
    });
  });

  afterEach(async () => {
    await redis.test!.instance.flushAll();
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
      results.push(await limiter.check({ key: 'user', cost: 1 }));
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

  it('should not accept cost exceeding max initially', async () => {
    const result = await limiter.check({ key: 'user', cost: 100 });
    expect(result).toBeFalsy();
  });
});

describe('Throttler', () => {
  let redisClient: RedisClientType;
  let throttler: Throttler;

  afterEach(async () => {
    await redis.test!.instance.flushAll();
  });

  describe('default cutoff mode (none)', () => {
    beforeAll(async () => {
      redisClient = redis.test?.instance as RedisClientType;
      throttler = new Throttler({
        name: 'test-throttler',
        storage: redisClient,
        timeoutSeconds: [1, 2, 4, 8, 16],
        grace: 3
      });
    });

    describe('check', () => {
      it('should return true if there are no increments', async () => {
        const results = [];
        for (let i = 0; i < 10; i++) {
          results.push(await throttler.check('user'));
        }

        expect(results).toEqual([true, true, true, true, true, true, true, true, true, true]);
      });

      it('should respect grace counter', async () => {
        for (let i = 0; i < 2; i++) {
          await throttler.increment('user');
        }
        const result1 = await throttler.check('user');
        expect(result1).toBeTruthy();

        await throttler.increment('user');
        const result2 = await throttler.check('user');
        expect(result2).toBeFalsy();

        for (let i = 0; i < 3; i++) {
          await throttler.increment('user');
        }
        const result3 = await throttler.check('user');

        expect(result3).toBeFalsy();
      });

      it('should respect the timeout', async () => {
        for (let i = 0; i < 8; i++) {
          await throttler.increment('user');
        }

        const now = Date.now();
        vi.spyOn(Date, 'now').mockImplementation(() => now + 3 * 1000);
        const result1 = await throttler.check('user');
        expect(result1).toBeFalsy();

        vi.spyOn(Date, 'now').mockImplementation(() => now + 30 * 1000);
        const result2 = await throttler.check('user');
        expect(result2).toBeTruthy();
      });
    });

    describe('increment', () => {
      it('should not increment over limit', async () => {
        for (let i = 0; i < 100; i++) {
          await throttler.increment('user');
        }

        const result1 = await throttler.check('user');
        expect(result1).toBeFalsy();

        const now = Date.now();
        vi.spyOn(Date, 'now').mockImplementation(() => now + 16 * 1000);
        const result2 = await throttler.check('user');

        expect(result2).toBeTruthy();
      });

      it('should not reset over time', async () => {
        for (let i = 0; i < 8; i++) {
          await throttler.increment('user');
        }

        const now = Date.now();
        vi.spyOn(Date, 'now').mockImplementation(() => now + 100 * 24 * 60 * 60 * 1000);

        const result = await throttler.check('user');

        expect(result).toBeTruthy();
      });
    });

    describe('reset', () => {
      it('should reset with grace', async () => {
        for (let i = 0; i < 8; i++) {
          await throttler.increment('user');
        }

        const result1 = await throttler.check('user');
        expect(result1).toBeFalsy();

        await throttler.reset('user');
        const result2 = await throttler.check('user');
        expect(result2).toBeTruthy();

        for (let i = 0; i < 2; i++) {
          await throttler.increment('user');
        }
        const result3 = await throttler.check('user');
        expect(result3).toBeTruthy();

        await throttler.increment('user');
        const result4 = await throttler.check('user');
        expect(result4).toBeFalsy();
      });
    });
  });

  describe('gradual cutoff mode', () => {
    beforeAll(async () => {
      redisClient = redis.test?.instance as RedisClientType;
      throttler = new Throttler({
        name: 'test-throttler',
        storage: redisClient,
        timeoutSeconds: [1, 2, 4, 8, 16],
        resetType: 'gradual',
        cutoffSeconds: 30,
        grace: 3
      });
    });

    describe('check', () => {
      it('should return true if there are no increments', async () => {
        const results = [];
        for (let i = 0; i < 10; i++) {
          results.push(await throttler.check('user'));
        }

        expect(results).toEqual([true, true, true, true, true, true, true, true, true, true]);
      });

      it('should respect grace counter', async () => {
        for (let i = 0; i < 2; i++) {
          await throttler.increment('user');
        }
        const result1 = await throttler.check('user');
        expect(result1).toBeTruthy();

        await throttler.increment('user');
        const result2 = await throttler.check('user');
        expect(result2).toBeFalsy();

        for (let i = 0; i < 3; i++) {
          await throttler.increment('user');
        }
        const result3 = await throttler.check('user');

        expect(result3).toBeFalsy();
      });

      it('should respect the timeout', async () => {
        for (let i = 0; i < 8; i++) {
          await throttler.increment('user');
        }

        const now = Date.now();
        vi.spyOn(Date, 'now').mockImplementation(() => now + 3 * 1000);
        const result1 = await throttler.check('user');
        expect(result1).toBeFalsy();

        vi.spyOn(Date, 'now').mockImplementation(() => now + 16 * 1000);
        const result2 = await throttler.check('user');
        expect(result2).toBeTruthy();
      });
    });

    describe('increment', () => {
      it('should not increment over limit', async () => {
        for (let i = 0; i < 100; i++) {
          await throttler.increment('user');
        }

        const result1 = await throttler.check('user');
        expect(result1).toBeFalsy();

        const now = Date.now();
        vi.spyOn(Date, 'now').mockImplementation(() => now + 16 * 1000);
        const result2 = await throttler.check('user');

        expect(result2).toBeTruthy();
      });

      it('should gradually decrease throttle over time', async () => {
        for (let i = 0; i < 8; i++) {
          await throttler.increment('user');
        }
        const result1 = await throttler.check('user');
        expect(result1).toBeFalsy();

        let now = Date.now();
        vi.spyOn(Date, 'now').mockImplementation(() => now + 16 * 1000);
        const result2 = await throttler.check('user');
        expect(result2).toBeTruthy();

        // should decrement twice and then increment once
        vi.spyOn(Date, 'now').mockImplementation(() => now + 60 * 1000);
        await throttler.increment('user');
        const result3 = await throttler.check('user');
        expect(result3).toBeFalsy();

        // should be 8 seconds after the increment
        vi.spyOn(Date, 'now').mockImplementation(() => now + 60 * 1000 + 7 * 1000);
        const result4 = await throttler.check('user');
        expect(result4).toBeFalsy();

        vi.spyOn(Date, 'now').mockImplementation(() => now + 60 * 1000 + 8 * 1000);
        const result5 = await throttler.check('user');
        expect(result5).toBeTruthy();
      });

      it('should reset grace counters over time', async () => {
        for (let i = 0; i < 8; i++) {
          await throttler.increment('user');
        }
        const result1 = await throttler.check('user');
        expect(result1).toBeFalsy();

        let now = Date.now();
        vi.spyOn(Date, 'now').mockImplementation(() => now + 16 * 1000);
        const result2 = await throttler.check('user');
        expect(result2).toBeTruthy();

        vi.spyOn(Date, 'now').mockImplementation(() => now + 2000 * 1000);
        // fully reset - 1
        await throttler.increment('user');
        const result3 = await throttler.check('user');
        expect(result3).toBeTruthy();

        // get rid of grace
        for (let i = 0; i < 2; i++) {
          await throttler.increment('user');
        }
        const result4 = await throttler.check('user');
        expect(result4).toBeFalsy();

        // wait for 1 second: timeoutSeconds[0]
        vi.spyOn(Date, 'now').mockImplementation(() => now + 2000 * 1000 + 1000);
        const result5 = await throttler.check('user');
        expect(result5).toBeTruthy();
      });
    });

    describe('reset', () => {
      it('should reset with grace', async () => {
        for (let i = 0; i < 8; i++) {
          await throttler.increment('user');
        }

        const result1 = await throttler.check('user');
        expect(result1).toBeFalsy();

        await throttler.reset('user');
        const result2 = await throttler.check('user');
        expect(result2).toBeTruthy();

        for (let i = 0; i < 2; i++) {
          await throttler.increment('user');
        }
        const result3 = await throttler.check('user');
        expect(result3).toBeTruthy();

        await throttler.increment('user');
        const result4 = await throttler.check('user');
        expect(result4).toBeFalsy();
      });
    });
  });

  describe('instant cutoff mode', () => {
    beforeAll(async () => {
      redisClient = redis.test?.instance as RedisClientType;
      throttler = new Throttler({
        name: 'test-throttler',
        storage: redisClient,
        timeoutSeconds: [1, 2, 4, 8, 16],
        resetType: 'instant',
        cutoffSeconds: 30,
        grace: 3
      });
    });

    describe('check', () => {
      it('should return true if there are no increments', async () => {
        const results = [];
        for (let i = 0; i < 10; i++) {
          results.push(await throttler.check('user'));
        }

        expect(results).toEqual([true, true, true, true, true, true, true, true, true, true]);
      });

      it('should respect grace counter', async () => {
        for (let i = 0; i < 2; i++) {
          await throttler.increment('user');
        }
        const result1 = await throttler.check('user');
        expect(result1).toBeTruthy();

        await throttler.increment('user');
        const result2 = await throttler.check('user');
        expect(result2).toBeFalsy();

        for (let i = 0; i < 3; i++) {
          await throttler.increment('user');
        }
        const result3 = await throttler.check('user');

        expect(result3).toBeFalsy();
      });

      it('should respect the timeout', async () => {
        for (let i = 0; i < 8; i++) {
          await throttler.increment('user');
        }

        const now = Date.now();
        vi.spyOn(Date, 'now').mockImplementation(() => now + 3 * 1000);
        const result1 = await throttler.check('user');
        expect(result1).toBeFalsy();

        vi.spyOn(Date, 'now').mockImplementation(() => now + 16 * 1000);
        const result2 = await throttler.check('user');
        expect(result2).toBeTruthy();
      });
    });

    describe('increment', () => {
      it('should not increment over limit', async () => {
        for (let i = 0; i < 100; i++) {
          await throttler.increment('user');
        }

        const result1 = await throttler.check('user');
        expect(result1).toBeFalsy();

        const now = Date.now();
        vi.spyOn(Date, 'now').mockImplementation(() => now + 16 * 1000);
        const result2 = await throttler.check('user');

        expect(result2).toBeTruthy();
      });

      it('should instantly reset over time', async () => {
        for (let i = 0; i < 8; i++) {
          await throttler.increment('user');
        }
        const result1 = await throttler.check('user');
        expect(result1).toBeFalsy();

        let now = Date.now();
        vi.spyOn(Date, 'now').mockImplementation(() => now + 16 * 1000);
        const result2 = await throttler.check('user');
        expect(result2).toBeTruthy();

        vi.spyOn(Date, 'now').mockImplementation(() => now + 30 * 1000);
        const result3 = await throttler.check('user');
        expect(result3).toBeTruthy();

        // in the grace
        await throttler.increment('user');
        const result4 = await throttler.check('user');
        expect(result4).toBeTruthy();
      });
    });

    describe('reset', () => {
      it('should reset with grace', async () => {
        for (let i = 0; i < 8; i++) {
          await throttler.increment('user');
        }

        const result1 = await throttler.check('user');
        expect(result1).toBeFalsy();

        await throttler.reset('user');
        const result2 = await throttler.check('user');
        expect(result2).toBeTruthy();

        for (let i = 0; i < 2; i++) {
          await throttler.increment('user');
        }
        const result3 = await throttler.check('user');
        expect(result3).toBeTruthy();

        await throttler.increment('user');
        const result4 = await throttler.check('user');
        expect(result4).toBeFalsy();
      });
    });
  });
});

describe('FixedRefillTokenBucketLimiter', () => {
  let redisClient: RedisClientType;
  let limiter: FixedRefillTokenBucketLimiter;

  beforeAll(async () => {
    redisClient = redis.test?.instance as RedisClientType;
    limiter = new FixedRefillTokenBucketLimiter({
      name: 'test-limiter',
      max: 5,
      refillIntervalSeconds: 1,
      storage: redisClient
    });
  });

  afterEach(async () => {
    await redis.test!.instance.flushAll();
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
      results.push(await limiter.check({ key: 'user', cost: 1 }));
    }

    expect(results).toEqual([true, true, true, true, true, false, false, false]);
  });

  it('should refill entire bucket after interval', async () => {
    await limiter.check({ key: 'user', cost: 5 });
    const initialResult = await limiter.check({ key: 'user', cost: 1 });
    expect(initialResult).toBeFalsy();

    const now = Date.now();
    vi.spyOn(Date, 'now').mockImplementation(() => now + 1 * 1000);

    const laterResult = await limiter.check({ key: 'user', cost: 5 });
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

  it('should not accept cost exceeding max initially', async () => {
    const result = await limiter.check({ key: 'user', cost: 100 });
    expect(result).toBeFalsy();
  });
});
