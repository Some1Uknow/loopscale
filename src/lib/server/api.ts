import { randomUUID } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export type ApiErrorCode =
  | "bad_request"
  | "rate_limited"
  | "stale_quote"
  | "quote_expired"
  | "unsupported_route"
  | "dependency_failure"
  | "internal_error";

const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    requestId: z.string(),
    retryable: z.boolean().optional()
  })
});

export function getRequestId(request: NextRequest) {
  return request.headers.get("x-request-id") ?? randomUUID();
}

export function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function logEvent(
  level: "info" | "warn" | "error",
  event: string,
  fields: Record<string, unknown>
) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    event,
    ...fields
  };
  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
    return;
  }
  console.log(line);
}

export function apiOk<T>(requestId: string, data: T, init?: ResponseInit) {
  const response = NextResponse.json(data, init);
  response.headers.set("cache-control", "no-store");
  response.headers.set("x-request-id", requestId);
  return response;
}

export function apiError(
  requestId: string,
  status: number,
  code: ApiErrorCode,
  message: string,
  retryable?: boolean
) {
  const response = NextResponse.json(
    {
      error: {
        code,
        message,
        requestId,
        retryable
      }
    },
    { status }
  );
  response.headers.set("cache-control", "no-store");
  response.headers.set("x-request-id", requestId);
  return response;
}

export async function readApiErrorMessage(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      const parsed = apiErrorSchema.parse(await response.json());
      return parsed.error.message;
    } catch {
      return `Request failed with ${response.status}`;
    }
  }

  const text = await response.text();
  return text || `Request failed with ${response.status}`;
}
