import type { RedisClusterType } from '@redis/client';
import type { RedisClientType } from 'redis';

/**
 * RATE LIMITER
 * Constant trickle of tockens into bucket WHILE user is using tokens
 * Each token is a single check so the max is how many checks or usages you can do before the limit
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
    const bucket = (await this.storage.hGetAll(redisQuery)) as Bucket<string>;
    const now = Date.now();

    if (!Object.keys(bucket).length) {
      const newBucket: Bucket<number> = {
        count: this.max - cost,
        refilledAt: now
      };
      await this.storage.hSet(redisQuery, newBucket);
      return true;
    }

    let count = parseInt(bucket.count);
    const refilledAt = parseInt(bucket.refilledAt);
    const refillAmount = Math.floor((now - refilledAt) / (this.refillIntervalSeconds * 1000)); // Time ellapsed over refill interval
    if (refillAmount > 0) {
      count = Math.min(count + refillAmount, this.max);
    }

    if (count < cost) {
      const updatedBucket: Bucket<number> = {
        count: count,
        refilledAt: now
      };
      await this.storage.hSet(redisQuery, updatedBucket);
      return false;
    }

    const updatedBucket: Bucket<number> = {
      count: count - cost,
      refilledAt: now
    };
    await this.storage.hSet(redisQuery, updatedBucket);
    return true;
  }

  public async reset(key: string): Promise<void> {
    const redisQuery = `${this.name}:${key}`;
    await this.storage.del(redisQuery);
  }
}

/**
 * THROTTLER
 * Slows down user but doesn't completely block/limit them
 *
 * Reset type:
 *    gradual: over time will go back down every cutoffMilli down timeoutSeconds[] until reset
 *    instant: over time will reset the throttle after cutoffMilli
 *    none: will never reset until explicitly calling reset
 *
 * Cutoff Milliseconds should be longer than the longest time timeoutSeconds input
 *    (works with gradual and instant reset types only)
 *
 * Grace: how many times you increment before the throttling actually starts
 */
export class Throttler {
  private name: string;
  private storage: RedisClientType | RedisClusterType;
  private timeoutSeconds: number[];
  private resetType?: 'gradual' | 'instant';
  private cutoffSeconds?: number;
  private grace: number;

  constructor({
    name,
    storage,
    timeoutSeconds,
    resetType,
    cutoffSeconds,
    grace
  }: {
    name: string;
    storage: RedisClientType | RedisClusterType;
    timeoutSeconds: number[];
    resetType?: 'gradual' | 'instant';
    cutoffSeconds?: number;
    grace?: number;
  }) {
    this.name = name;
    this.storage = storage;
    this.timeoutSeconds = timeoutSeconds;
    this.resetType = resetType;
    if (cutoffSeconds && timeoutSeconds[timeoutSeconds.length - 1] < cutoffSeconds) {
      throw new Error('Cutoff seconds needs to be longer than the longest time in timeout seconds');
    } else {
      this.cutoffSeconds = cutoffSeconds;
    }
    this.grace = grace || 0;
  }

  public async check(key: string): Promise<boolean> {
    const redisQuery = `${this.name}:${key}`;
    const counter = (await this.storage.hGetAll(redisQuery)) as ThrottlingCounter<string>;
    if (!Object.keys(counter).length || parseInt(counter.graceCounter) > 0) {
      return true;
    }

    return (
      Date.now() - parseInt(counter.updatedAt) >=
      this.timeoutSeconds[parseInt(counter.timeoutIndex)] * 1000
    );
  }

  public async increment(key: string): Promise<void> {
    await this.cutoffReset(key);
    const redisQuery = `${this.name}:${key}`;
    const counter = (await this.storage.hGetAll(redisQuery)) as ThrottlingCounter<string>;
    const now = Date.now();
    if (!Object.keys(counter).length) {
      const newCounter: ThrottlingCounter<number> = {
        timeoutIndex: 0, // first index of timeoutSeconds[]
        graceCounter: this.grace,
        updatedAt: now
      };
      this.storage.hSet(redisQuery, newCounter);
    } else if (parseInt(counter.graceCounter) > 0) {
      // don't need to update time on updatedAt because it's grace anyways
      this.storage.hSet(redisQuery, 'graceCounter', parseInt(counter.graceCounter) - 1);
    } else {
      const updatedCounter: ThrottlingCounter<number> = {
        timeoutIndex: Math.min(parseInt(counter.timeoutIndex + 1), this.timeoutSeconds.length - 1),
        graceCounter: parseInt(counter.graceCounter),
        updatedAt: now
      };
      this.storage.hSet(redisQuery, updatedCounter);
    }
  }

  public async reset(key: string): Promise<void> {
    const redisQuery = `${this.name}:${key}`;
    await this.storage.del(redisQuery);
  }

  /**
   * Run inside of increment because check should always work if cutoff time is longer than the last
   * element in timeout seconds
   */
  private async cutoffReset(key: string): Promise<void> {
    // reset type will be paired with cut off seconds
    if (!this.resetType || !this.cutoffSeconds) {
      return;
    }

    const redisQuery = `${this.name}:${key}`;
    const now = Date.now();
    const counter = (await this.storage.hGetAll(redisQuery)) as ThrottlingCounter<string>;
    if (!Object.keys(counter).length) {
      return;
    }

    const cutoffMilli = this.cutoffSeconds * 1000;
    const timeDifference = now - parseInt(counter.updatedAt);
    console.log('cuttoffReset timeDifference:', timeDifference);
    if (timeDifference >= cutoffMilli) {
      switch (this.resetType) {
        case 'instant':
          await this.reset(key);
          break;

        case 'gradual':
          const increments = Math.floor(timeDifference / cutoffMilli);
          console.log('increments:', increments);
          if (!increments) {
            return;
          }
          let graceCounter = parseInt(counter.graceCounter);
          let timeoutIndex = parseInt(counter.timeoutIndex);

          let i = increments;
          while (i > 0) {
            if (graceCounter === this.grace && timeoutIndex === 0) {
              await this.reset(key);
              return;
            }

            if (timeoutIndex === 0) {
              const graceDifference = this.grace - graceCounter;
              if (graceDifference >= i) {
                graceCounter += i;
                i = 0;
              } else {
                await this.reset(key);
                return;
              }
            } else {
              if (timeoutIndex >= i) {
                timeoutIndex -= i;
                i = 0;
              } else {
                i -= timeoutIndex;
                timeoutIndex = 0;
              }
            }
          }

          const updatedCounter: ThrottlingCounter<number> = {
            timeoutIndex: timeoutIndex,
            graceCounter: graceCounter,
            updatedAt: parseInt(counter.updatedAt)
          };
          this.storage.hSet(redisQuery, updatedCounter);
          break;

        default:
          return;
      }
    }
  }
}

/**
 * RATE LIMITER
 * After a certain period, the entire bucket is refilled with tokens
 */
export class FixedRefillTokenBucketLimiter {
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
    const bucket = (await this.storage.hGetAll(redisQuery)) as Bucket<string>;
    const now = Date.now();

    if (!bucket) {
      const newBucket: Bucket<number> = {
        count: this.max - cost,
        refilledAt: now
      };
      await this.storage.hSet(redisQuery, newBucket);
      return true;
    }

    const count = parseInt(bucket.count);
    let refilled = false;
    if (now - parseInt(bucket.refilledAt) >= this.refillIntervalSeconds * 1000) {
      refilled = true;
    }

    if (count < cost) {
      if (refilled) {
        const updatedBucket: Bucket<number> = {
          count: this.max,
          refilledAt: now
        };
        this.storage.hSet(redisQuery, updatedBucket);
      }
      return false;
    }

    if (refilled) {
      const updatedBucket: Bucket<number> = {
        count: this.max - cost,
        refilledAt: now
      };
      this.storage.hSet(redisQuery, updatedBucket);
    }
    return true;
  }

  public async reset(key: string): Promise<void> {
    const redisQuery = `${this.name}:${key}`;
    await this.storage.del(redisQuery);
  }
}

type Bucket<T> = {
  count: T;
  refilledAt: T;
};

type ThrottlingCounter<T> = {
  timeoutIndex: T;
  graceCounter: T;
  updatedAt: T;
};
