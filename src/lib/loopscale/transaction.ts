import bs58 from "bs58";
import { PublicKey, VersionedMessage, VersionedTransaction } from "@solana/web3.js";

import type { VersionedTransactionResponse } from "@/lib/loopscale/types";

function decodeBase64(value: string) {
  if (typeof atob === "function") {
    return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
  }

  return Uint8Array.from(Buffer.from(value, "base64"));
}

export function decodeLoopscaleSignature(value: string) {
  try {
    const decoded = bs58.decode(value);
    if (decoded.length === 64) {
      return decoded;
    }
  } catch {
    // Fall through to base64 decoding.
  }

  const decoded = decodeBase64(value);
  if (decoded.length !== 64) {
    throw new Error("Loopscale returned an invalid transaction signature.");
  }
  return decoded;
}

export function deserializeLoopscaleTransaction(input: VersionedTransactionResponse) {
  const messageBytes = decodeBase64(input.message);
  const message = VersionedMessage.deserialize(messageBytes);
  const transaction = new VersionedTransaction(message);

  for (const signer of input.signatures) {
    if (!signer.signature) continue;
    transaction.addSignature(
      new PublicKey(signer.publicKey),
      decodeLoopscaleSignature(signer.signature)
    );
  }

  return transaction;
}
