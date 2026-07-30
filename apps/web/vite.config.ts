import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

// Consume @brgy/shared straight from its TS source: avoids CJS-interop issues
// in the Rollup build and hot-reloads shared changes without a rebuild.
const sharedSrc = fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiProxy = env.VITE_API_PROXY || 'http://localhost:3000';

  return {
    plugins: [react()],
    resolve: {
      alias: { '@brgy/shared': sharedSrc },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': { target: apiProxy, changeOrigin: true },
        '/socket.io': { target: apiProxy, changeOrigin: true, ws: true },
      },
    },
  };
});
