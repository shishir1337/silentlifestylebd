import "server-only";

import { createClient, type RedisClientType } from "redis";
import type { BetterAuthRateLimitStorage } from "better-auth";

/**
 * Redis, used for exactly one job: rate-limit counters on the auth endpoints.
 *
 * Not an application cache — Next's own cache already covers catalogue reads,
 * and a second cache with its own invalidation rules would be two sources of
 * truth about the same data.
 *
 * Rate limiting is the job that genuinely needs shared, expiring state.
 * Sign-in and sign-up are what actually get attacked, and in-memory counters
 * reset on every deploy, handing an attacker a fresh quota on a schedule they
 * can watch.
 *
 * ## Why this is not better-auth's `secondaryStorage`
 *
 * Configuring `secondaryStorage` would have covered rate limiting, but it also
 * moves *sessions* out of Postgres — and per better-auth's own docs, "reads
 * are always done from the secondary storage" even with
 * `storeSessionInDatabase: true`. Losing the Redis volume would then sign out
 * every customer, some of them mid-checkout, to speed up a lookup this shop
 * does not make often enough to care about. `rateLimit.customStorage` gets the
 * same Redis-backed limiting with none of that.
 */

const globalForRedis = globalThis as unknown as { redisReady?: Promise<RedisClientType> };

function connect(): Promise<RedisClientType> {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error(
      "REDIS_URL is not set. Copy .env.example to .env and fill it in, then run `pnpm db:up`.",
    );
  }

  const client: RedisClientType = createClient({
    url,
    socket: {
      // Give up doubling forever; a request should fail fast rather than hang
      // on a dependency that is not load-bearing.
      reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
    },
  });

  // Without a listener an connection error is an unhandled 'error' event,
  // which takes down the whole process over a cache being briefly unavailable.
  client.on("error", (error) => {
    console.error("[redis]", error instanceof Error ? error.message : error);
  });

  return client.connect();
}

/** One connection per process, reused across HMR reloads in development. */
function redis(): Promise<RedisClientType> {
  globalForRedis.redisReady ??= connect();
  return globalForRedis.redisReady;
}

/**
 * Count this request and report whether it is allowed — in one round trip.
 *
 * The atomicity is the point. `GET` then `SET` lets N simultaneous requests
 * all read the same stale count and all pass, which is precisely the burst a
 * credential-stuffing script produces. A Lua script runs on the server as a
 * single operation, so the Nth request sees N.
 *
 * `EXPIRE` is set only when the counter is created, so the window is fixed
 * from the first request rather than sliding forward with every retry — an
 * attacker cannot hold themselves permanently blocked-but-counting, and an
 * honest user's window always ends.
 */
const CONSUME = `
  local n = redis.call('INCR', KEYS[1])
  if n == 1 then
    redis.call('EXPIRE', KEYS[1], ARGV[1])
    return {1, 0}
  end
  if n > tonumber(ARGV[2]) then
    local ttl = redis.call('TTL', KEYS[1])
    if ttl < 0 then ttl = tonumber(ARGV[1]) end
    return {0, ttl}
  end
  return {1, 0}
`;

export const rateLimitStorage: BetterAuthRateLimitStorage = {
  async consume(key, rule) {
    try {
      const client = await redis();
      const reply = (await client.eval(CONSUME, {
        keys: [`slbd:rl:${key}`],
        arguments: [String(rule.window), String(rule.max)],
      })) as [number, number];

      const [allowed, retryAfter] = reply;
      return allowed === 1
        ? { allowed: true, retryAfter: null }
        : { allowed: false, retryAfter };
    } catch (error) {
      /**
       * Fail open, deliberately.
       *
       * If Redis is unreachable the choice is between "rate limiting stops
       * counting" and "nobody can sign in" — including the shop owner, who
       * would then be locked out of their own orders during the outage. For a
       * single-shop storefront the first is clearly the lesser harm. It is
       * logged loudly because it must not pass unnoticed.
       */
      console.error(
        "[redis] rate limiting is OPEN — counters unavailable:",
        error instanceof Error ? error.message : error,
      );
      return { allowed: true, retryAfter: null };
    }
  },
};

/**
 * The same counter, for things that are not sign-in.
 *
 * better-auth guards its own endpoints. Everything else a stranger can reach
 * has to guard itself, and this storefront has two that matter: placing an
 * order, and looking one up.
 *
 * Returns whether the caller may proceed and, when not, how long until the
 * window ends — so the refusal can say when to try again rather than just no.
 */
export interface RateVerdict {
  allowed: boolean;
  /** Seconds until the window ends. Zero when allowed. */
  retryAfter: number;
}

export async function consume(
  key: string,
  window: number,
  max: number,
): Promise<RateVerdict | null> {
  try {
    const client = await redis();
    const reply = (await client.eval(CONSUME, {
      keys: [`slbd:rl:${key}`],
      arguments: [String(window), String(max)],
    })) as [number, number];
    return { allowed: reply[0] === 1, retryAfter: reply[1] };
  } catch (error) {
    /*
      `null` means "could not count", not "allowed".

      The caller decides what that is worth, because the answer differs: an
      order that cannot be placed is a lost sale, and an order lookup that
      cannot be counted is a stranger free to guess at other people's
      addresses. Returning a cheerful `allowed: true` here would make that
      decision silently, in the wrong place.
    */
    console.error(
      "[redis] rate limiting is BLIND — counters unavailable:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}
