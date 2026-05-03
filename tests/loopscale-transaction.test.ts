import test from "node:test";
import assert from "node:assert/strict";

import bs58 from "bs58";

import { decodeLoopscaleSignature } from "@/lib/loopscale/transaction";

test("decodeLoopscaleSignature accepts base58 signatures", () => {
  const bytes = new Uint8Array(64).fill(7);
  const encoded = bs58.encode(bytes);

  const decoded = decodeLoopscaleSignature(encoded);

  assert.deepEqual(decoded, bytes);
});

test("decodeLoopscaleSignature falls back to base64 signatures", () => {
  const bytes = new Uint8Array(64).fill(9);
  const encoded = Buffer.from(bytes).toString("base64");

  const decoded = decodeLoopscaleSignature(encoded);

  assert.deepEqual(decoded, bytes);
});
