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
      fs: {
        // The dev server runs with --host, so it is reachable from the whole
        // network. By default Vite will serve any file under the workspace
        // root, which here means the API source and deploy configuration were
        // readable over /@fs/. Restrict it to what the browser legitimately
        // needs: this app, the shared package, and the installed dependencies.
        strict: true,
        allow: [
          fileURLToPath(new URL('.', import.meta.url)),
          fileURLToPath(new URL('../../packages/shared', import.meta.url)),
          fileURLToPath(new URL('../../node_modules', import.meta.url)),
        ],
        // Belt and braces for anything that slips inside an allowed path.
        deny: ['**/.env', '**/.env.*', '**/*.pem', '**/*.key', '**/*.crt'],
      },
      proxy: {
        '/api': { target: apiProxy, changeOrigin: true },
        '/socket.io': { target: apiProxy, changeOrigin: true, ws: true },
      },
    },
  };
});
