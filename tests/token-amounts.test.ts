import test from "node:test";
import assert from "node:assert/strict";

import { InputValidationError, parseTokenAmountInput } from "@/lib/token-amounts";

test("accepts token amounts that map exactly to base units", () => {
  const parsed = parseTokenAmountInput({
    value: "0.000001",
    mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    fieldLabel: "Borrow amount"
  });

  assert.equal(parsed.amountUi, 0.000001);
  assert.equal(parsed.baseUnits, 1);
});

test("rejects token amounts with more precision than the token supports", () => {
  assert.throws(
    () =>
      parseTokenAmountInput({
        value: "0.0000004",
        mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        fieldLabel: "Borrow amount"
      }),
    (error: unknown) =>
      error instanceof InputValidationError &&
      error.message === "Borrow amount supports up to 6 decimal places."
  );
});

test("rejects another sub-base-unit amount instead of rounding it up", () => {
  assert.throws(
    () =>
      parseTokenAmountInput({
        value: "0.0000006",
        mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        fieldLabel: "Borrow amount"
      }),
    (error: unknown) =>
      error instanceof InputValidationError &&
      error.message === "Borrow amount supports up to 6 decimal places."
  );
});
