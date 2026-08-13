import axios from 'axios';

// The Worker sometimes forwards the RTK API's own error payload verbatim,
// which can be a structured object ({ code, message, details, ... }) rather
// than a plain string — passing that straight into a toast used to render
// "[object Object]" as a raw React child and crash the whole page. Always
// dig out a real string, however the error is shaped.
function stringify(data: unknown): string | undefined {
  if (typeof data === 'string' && data) return data;
  if (data && typeof data === 'object') {
    const obj = data as { message?: unknown; error?: unknown };
    if (typeof obj.message === 'string' && obj.message) return obj.message;
    const nested = stringify(obj.error);
    if (nested) return nested;
  }
  return undefined;
}

export function errorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    return stringify(err.response?.data?.error) ?? stringify(err.response?.data) ?? err.message ?? fallback;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}
