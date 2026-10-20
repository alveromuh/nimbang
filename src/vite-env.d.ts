/// <reference types="vite/client" />

/**
 * Injected by the `define` block in vite.config.ts, which reads package.json.
 *
 * Declared here rather than written as literals in JSX: a hardcoded "0.1.0"
 * would drift from the manifest, and the colophon would then be claiming a
 * version that is not true. Vitest loads the same config, so both are present
 * under test too.
 */
declare const __APP_VERSION__: string;
declare const __APP_LICENSE__: string;