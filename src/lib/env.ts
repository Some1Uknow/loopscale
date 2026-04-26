import { z } from "zod";

const envSchema = z.object({
  LOOPSCALE_API_BASE_URL: z.string().url().default("https://tars.loopscale.com/v1"),
  JUPITER_PRICE_API_BASE_URL: z.string().url().default("https://lite-api.jup.ag/price/v3"),
  LOOPSCALE_UPSTREAM_TIMEOUT_MS: z.coerce.number().int().min(1000).max(30000).default(8000),
  LOOP_QUOTE_TTL_MS: z.coerce.number().int().min(5000).max(300000).default(30000),
  QUOTE_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).max(300000).default(60000),
  QUOTE_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(500).default(30),
  CREATE_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).max(300000).default(60000),
  CREATE_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(100).default(10),
  LOANS_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).max(300000).default(60000),
  LOANS_RATE_LIMIT_MAX: z.coerce.number().int().min(1).max(200).default(30)
});

let cachedEnv: z.infer<typeof envSchema> | null = null;

export function getServerEnv() {
  if (cachedEnv) return cachedEnv;

  cachedEnv = envSchema.parse({
    LOOPSCALE_API_BASE_URL: process.env.LOOPSCALE_API_BASE_URL,
    JUPITER_PRICE_API_BASE_URL: process.env.JUPITER_PRICE_API_BASE_URL,
    LOOPSCALE_UPSTREAM_TIMEOUT_MS: process.env.LOOPSCALE_UPSTREAM_TIMEOUT_MS,
    LOOP_QUOTE_TTL_MS: process.env.LOOP_QUOTE_TTL_MS,
    QUOTE_RATE_LIMIT_WINDOW_MS: process.env.QUOTE_RATE_LIMIT_WINDOW_MS,
    QUOTE_RATE_LIMIT_MAX: process.env.QUOTE_RATE_LIMIT_MAX,
    CREATE_RATE_LIMIT_WINDOW_MS: process.env.CREATE_RATE_LIMIT_WINDOW_MS,
    CREATE_RATE_LIMIT_MAX: process.env.CREATE_RATE_LIMIT_MAX,
    LOANS_RATE_LIMIT_WINDOW_MS: process.env.LOANS_RATE_LIMIT_WINDOW_MS,
    LOANS_RATE_LIMIT_MAX: process.env.LOANS_RATE_LIMIT_MAX
  });

  return cachedEnv;
}
