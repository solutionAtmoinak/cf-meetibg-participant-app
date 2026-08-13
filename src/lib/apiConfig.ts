// Shared config for talking to the deployed `rtk-session` Cloudflare Worker
// (https://rtk-session.pritam-solutioninfotech.workers.dev).
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'https://rtk-session.pritam-solutioninfotech.workers.dev';
