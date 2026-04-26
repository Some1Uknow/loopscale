type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function consumeRateLimit(input: {
  key: string;
  limit: number;
  windowMs: number;
  now?: number;
}) {
  const now = input.now ?? Date.now();
  const current = buckets.get(input.key);

  if (!current || current.resetAt <= now) {
    const next = {
      count: 1,
      resetAt: now + input.windowMs
    };
    buckets.set(input.key, next);
    return {
      allowed: true,
      remaining: Math.max(input.limit - 1, 0),
      resetAt: next.resetAt
    };
  }

  if (current.count >= input.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: current.resetAt
    };
  }

  current.count += 1;
  buckets.set(input.key, current);

  return {
    allowed: true,
    remaining: Math.max(input.limit - current.count, 0),
    resetAt: current.resetAt
  };
}
