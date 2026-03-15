import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: { browser: 'src/browser.ts' },
    format: ['esm'],
    dts: true,
    outDir: 'dist',
    external: ['linkedom', 'happy-dom'],
    platform: 'browser',
    minify: true,
  },
  {
    entry: { server: 'src/server.ts' },
    format: ['esm', 'cjs'],
    dts: true,
    outDir: 'dist',
    external: ['linkedom', 'happy-dom'],
    platform: 'node',
    minify: true,
  },
]);
