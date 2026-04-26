import { z } from "zod";

import { getServerEnv } from "@/lib/env";

export async function loopscaleFetch<T>({
  path,
  method = "POST",
  body,
  headers
}: {
  path: string;
  method?: "GET" | "POST";
  body?: unknown;
  headers?: HeadersInit;
}): Promise<T> {
  const env = getServerEnv();

  const response = await fetch(`${env.LOOPSCALE_API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(env.LOOPSCALE_UPSTREAM_TIMEOUT_MS)
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Loopscale request failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

export function parseJsonBody<T>(raw: unknown, schema: z.ZodSchema<T>) {
  return schema.parse(raw);
}
