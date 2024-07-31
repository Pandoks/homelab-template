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
    const bucket = await this.storage.hGetAll(redisQuery);
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
 *
 * Grace: how many times you increment before the throttling actually starts
 */
export class Throttler {
  public timeoutSeconds: number[];

  private name: string;
  private resetType: 'gradual' | 'instant' | null;
  private cutoffMilli: number;
  private grace: number;
  private storage: RedisClientType | RedisClusterType;

  constructor({
    name,
    storage,
    timeoutSeconds,
    resetType,
    cutoffMilli,
    grace
  }: {
    name: string;
    storage: RedisClientType | RedisClusterType;
    timeoutSeconds: number[];
    resetType?: 'gradual' | 'instant' | null;
    cutoffMilli?: number;
    grace?: number;
  }) {
    this.name = name;
    this.storage = storage;
    this.timeoutSeconds = timeoutSeconds;
    this.resetType = resetType || null;
    this.cutoffMilli = cutoffMilli || 24 * 60 * 60 * 1000; // 1 day
    this.grace = grace || 0;
  }

  public async check(key: string): Promise<boolean> {
    await this.cutoffReset(key);
    const redisQuery = `${this.name}:${key}`;
    const counter = await this.storage.hGetAll(redisQuery);
    if (!counter || parseInt(counter.graceCounter) > 0) {
      return true;
    }

    const now = Date.now();
    return (
      now - parseInt(counter.updatedAt) >= this.timeoutSeconds[parseInt(counter.timeout)] * 1000
    );
  }

  public async increment(key: string): Promise<void> {
    const redisQuery = `${this.name}:${key}`;
    const counter = await this.storage.hGetAll(redisQuery);
    const now = Date.now();
    if (!counter) {
      this.storage.hSet(redisQuery, {
        timeoutIndex: 0, // first index of timeoutSeconds[]
        graceCounter: this.grace,
        updatedAt: now
      });
    } else if (parseInt(counter.graceCounter) > 0) {
      this.storage.hSet(redisQuery, 'graceCounter', parseInt(counter.graceCounter) - 1);
    } else {
      this.storage.hSet(redisQuery, {
        timeoutIndex: Math.min(parseInt(counter.timeoutIndex + 1), this.timeoutSeconds.length - 1),
        updatedAt: now
      });
    }
  }

  public async reset(key: string): Promise<void> {
    const redisQuery = `${this.name}:${key}`;
    await this.storage.del(redisQuery);
  }

  private async cutoffReset(key: string): Promise<void> {
    if (!this.resetType) {
      return;
    }

    const redisQuery = `${this.name}:${key}`;
    const counter = await this.storage.hGetAll(redisQuery);
    if (!counter || !counter.checkedAt) {
      return;
    }

    const now = Date.now();
    const timeDifference = now - parseInt(counter.checkedAt);
    if (timeDifference >= this.cutoffMilli) {
      switch (this.resetType) {
        case 'instant':
          this.reset(key);
          break;

        case 'gradual':
          let increments = Math.floor(timeDifference / this.cutoffMilli);
          if (!increments) {
            return;
          }
          let graceCounter = parseInt(counter.graceCounter);
          let timeoutIndex = parseInt(counter.timeoutIndex);

          while (increments > 0) {
            if (graceCounter === this.grace && timeoutIndex === 0) {
              this.reset(key);
              return;
            }

            if (timeoutIndex === 0) {
              const graceDifference = this.grace - graceCounter;
              if (graceDifference >= increments) {
                graceCounter += increments;
                increments = 0;
              } else {
                this.reset(key);
                return;
              }
            } else {
              if (timeoutIndex >= increments) {
                timeoutIndex -= increments;
                increments = 0;
              } else {
                increments -= timeoutIndex;
                timeoutIndex = 0;
              }
            }
          }

          this.storage.hSet(redisQuery, {
            timeoutIndex: timeoutIndex,
            graceCounter: graceCounter,
            updatedAt: counter.updatedAt,
            checkedAt: now
          });
          break;

        default:
          return;
      }
    }
  }
}
