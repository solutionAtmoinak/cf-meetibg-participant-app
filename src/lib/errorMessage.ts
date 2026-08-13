import axios from 'axios';

export function errorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) return err.response?.data?.error ?? err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}
