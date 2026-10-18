import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'core',
          environment: 'node',
          // src/*.test.ts is the integration test. Without it here, the file
          // matches no project and silently never runs.
          include: ['src/core/**/*.test.ts', 'src/*.test.ts'],
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
