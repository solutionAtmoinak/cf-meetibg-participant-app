import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const certsDir = fileURLToPath(new URL('../certs', import.meta.url));

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    host: true,
    https: {
      key: readFileSync(`${certsDir}/dev-key.pem`),
      cert: readFileSync(`${certsDir}/dev-cert.pem`),
    },
  },
});
