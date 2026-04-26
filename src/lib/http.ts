export async function readResponseError(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    try {
      const parsed = (await response.json()) as {
        error?: {
          message?: string;
        };
      };
      if (parsed.error?.message) return parsed.error.message;
    } catch {
      return `Request failed with ${response.status}`;
    }
  }

  const text = await response.text();
  return text || `Request failed with ${response.status}`;
}
