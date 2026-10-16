import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig, type Plugin} from 'vite';

/**
 * The Bergamot translation worker (bundled by Vite into assets/) loads its
 * Emscripten glue and WASM binary relative to its own URL, so both files are
 * copied next to it in the production build.
 */
function bergamotWorkerAssets(): Plugin {
  const workerDir = path.resolve(__dirname, 'node_modules/@browsermt/bergamot-translator/worker');
  const files = ['bergamot-translator-worker.js', 'bergamot-translator-worker.wasm'];
  let outDir = 'dist';
  let assetsDir = 'assets';
  return {
    name: 'bergamot-worker-assets',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
      assetsDir = config.build.assetsDir;
    },
    writeBundle() {
      const target = path.join(outDir, assetsDir);
      fs.mkdirSync(target, {recursive: true});
      for (const file of files) fs.copyFileSync(path.join(workerDir, file), path.join(target, file));
    },
  };
}

export default defineConfig(() => {
  return {
    base: process.env.GITHUB_PAGES ? '/Mark2HTMLStudio/' : '/',
    plugins: [react(), tailwindcss(), bergamotWorkerAssets()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    // Pre-bundling would break the `new URL('./worker/...', import.meta.url)` worker lookup in dev
    optimizeDeps: {
      exclude: ['@browsermt/bergamot-translator'],
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
