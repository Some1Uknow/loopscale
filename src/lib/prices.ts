import { getServerEnv } from "@/lib/env";

export type TokenUsdPrice = {
  usdPrice: number;
  blockId: number;
  decimals: number;
};

export async function fetchTokenUsdPrices(mints: string[]) {
  const env = getServerEnv();
  const uniqueMints = Array.from(new Set(mints.filter(Boolean)));

  if (uniqueMints.length === 0) {
    return {} as Record<string, TokenUsdPrice>;
  }

  const response = await fetch(`${env.JUPITER_PRICE_API_BASE_URL}?ids=${uniqueMints.join(",")}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(env.LOOPSCALE_UPSTREAM_TIMEOUT_MS)
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Jupiter price request failed with ${response.status}`);
  }

  return (await response.json()) as Record<string, TokenUsdPrice>;
}
