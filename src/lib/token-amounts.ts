import { getTokenByMint } from "@/lib/borrow-catalog";

export class InputValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InputValidationError";
  }
}

function normalizeAmountValue(value: number | string, fieldLabel: string) {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new InputValidationError(`${fieldLabel} must be a valid number.`);
    }
    return String(value);
  }

  const normalized = value.trim();
  if (!normalized) {
    throw new InputValidationError(`${fieldLabel} is required.`);
  }
  return normalized;
}

function parseBaseUnitsFromDecimal(input: {
  value: number | string;
  decimals: number;
  fieldLabel: string;
}) {
  const normalized = normalizeAmountValue(input.value, input.fieldLabel);

  if (!/^\d+(?:\.\d+)?$/.test(normalized)) {
    throw new InputValidationError(`${input.fieldLabel} must be a plain decimal number.`);
  }

  const [wholePart, fractionalPart = ""] = normalized.split(".");
  if (fractionalPart.length > input.decimals) {
    throw new InputValidationError(
      `${input.fieldLabel} supports up to ${input.decimals} decimal place${
        input.decimals === 1 ? "" : "s"
      }.`
    );
  }

  const baseUnitsText = `${wholePart}${fractionalPart.padEnd(input.decimals, "0")}`.replace(
    /^0+/,
    ""
  );
  const baseUnits = BigInt(baseUnitsText || "0");

  if (baseUnits === BigInt(0)) {
    throw new InputValidationError(`${input.fieldLabel} must be greater than zero.`);
  }

  if (baseUnits > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new InputValidationError(`${input.fieldLabel} is too large to process safely.`);
  }

  return {
    normalized,
    baseUnits: Number(baseUnits),
    amountUi: Number(normalized)
  };
}

export function parseTokenAmountInput(input: {
  value: number | string;
  mint: string;
  fieldLabel: string;
}) {
  const token = getTokenByMint(input.mint);
  if (!token) {
    throw new InputValidationError(`Unsupported token for ${input.fieldLabel.toLowerCase()}.`);
  }

  return {
    token,
    ...parseBaseUnitsFromDecimal({
      value: input.value,
      decimals: token.decimals,
      fieldLabel: input.fieldLabel
    })
  };
}

export function uiToBaseUnitsExact(amount: number | string, decimals: number, fieldLabel = "Amount") {
  return parseBaseUnitsFromDecimal({
    value: amount,
    decimals,
    fieldLabel
  }).baseUnits;
}
