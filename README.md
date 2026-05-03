# Loopscale Borrow Shopper

Next.js consumer app for finding and executing a fixed-rate borrow on Loopscale.

The product is intentionally narrow:

- enter borrow amount
- choose a fixed term
- enter collateral
- see the best visible route
- review the route
- build and sign the loan transaction

## Run locally

```bash
cp .env.example .env.local
make install
make dev
```

Open `http://localhost:3000/borrow`.

## Commands

```bash
make install
make dev
make web-build
make web-start
make typecheck
make lint
make test
make clean
```

## Product surfaces

- `/borrow`
  Main quote-shopping flow.
- `/review`
  Final route confirmation before signing.
- `/my-loans`
  Wallet-connected list of active loans.
- `/learn`
  Short explanation layer for fixed-rate borrowing.

## Loopscale endpoints used

The app calls Loopscale through Next route handlers under `src/app/api/loopscale/*`.

- `POST /markets/quote`
- `POST /markets/quote/max`
- `POST /markets/creditbook/create`
- `POST /markets/loans/info`

## Environment

- `LOOPSCALE_API_BASE_URL`
  Defaults to `https://tars.loopscale.com/v1`
- `JUPITER_PRICE_API_BASE_URL`
  Defaults to `https://lite-api.jup.ag/price/v3`
- `LOOPSCALE_UPSTREAM_TIMEOUT_MS`
  Timeout for Loopscale and Jupiter upstream requests
- `LOOP_QUOTE_TTL_MS`
  Quote lifetime used for review and create-loan guards
- `QUOTE_RATE_LIMIT_*`, `CREATE_RATE_LIMIT_*`, `LOANS_RATE_LIMIT_*`
  Fixed-window API protections for local/server deployments
- `NEXT_PUBLIC_SOLANA_RPC_URL`
  Solana RPC used for transaction submission. For mainnet sends, use a dedicated provider; the public `https://api.mainnet-beta.solana.com` endpoint may reject `sendRawTransaction` with `403 Access forbidden`.
- `NEXT_PUBLIC_DEMO_WALLET`
  Wallet used for quote discovery before a user connects

## Production safeguards

- Quote discovery works without a connected wallet by using the demo wallet.
- Quote results include a fingerprint and expiry window.
- `create-loan` re-quotes server-side and rejects expired, stale, or undercollateralized requests.
- The server applies fixed-window rate limits to quote, create-loan, and my-loans routes.
- `/api/health` supports a basic mode and a dependency-checking `?mode=full` mode.
- API responses include `x-request-id` and structured server logs for debugging.
- Loan creation still requires a browser wallet to sign and submit the transaction.
- The app intentionally supports a curated asset list defined in `src/lib/borrow-catalog.ts`.
