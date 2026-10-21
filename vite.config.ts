import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { chatApi } from './server/chat';

// Read rather than imported: `resolveJsonModule` is off, so a JSON import would
// not type-check. One source for both values, so the rail's colophon cannot
// claim a version or a licence the manifest does not have.
const manifest = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version: string; license: string };

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(manifest.version),
    __APP_LICENSE__: JSON.stringify(manifest.license),
  },
  server: {
    // README.md and docs/how-to-use.md document the app at localhost:5199 and
    // give a share link to paste there. Vite's 5173 default would silently
    // contradict both, and drafts would land in a different localStorage origin.
    port: 5199,
    // Fail loudly rather than drifting to 5200, which would leave the running
    // app somewhere the docs do not point.
    strictPort: true,
  },
  preview: { port: 5199, strictPort: true },
  // The only server-side piece: it holds the gateway key, which a browser cannot.
  // See server/chat.ts for why it exists and what it refuses to do.
  plugins: [react(), chatApi()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'core',
          environment: 'node',
          // src/*.test.ts is the integration test. Without it here, the file
          // matches no project and silently never runs. The examples test is
          // here too: it is a plain data check on the engine, and the example
          // itself stays outside the TS project so `node --experimental-strip-types`
          // can run it.
          include: ['src/core/**/*.test.ts', 'src/*.test.ts', 'examples/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'suggestions',
          environment: 'node',
          include: ['src/chat/**/*.test.ts', 'server/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'ui',
          environment: 'jsdom',
          // jsdom only provides localStorage when the document has an origin;
          // without a url it is undefined and every storage test throws.
          environmentOptions: {
            jsdom: {
              url: 'http://localhost/',
              // jsdom 30 gates localStorage behind a non-null storage quota in
              // some builds; set it so the adapter is testable.
              storageQuota: 10000000,
            },
          },
          // Both extensions: UI components are .tsx, but the storage adapter and
          // other non-JSX UI modules are .ts and still need jsdom's localStorage.
          include: ['src/ui/**/*.test.ts', 'src/ui/**/*.test.tsx'],
          setupFiles: ['./src/ui/setupTests.ts'],
        },
      },
    ],
  },
});
