import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  base: '/assets/dist/',
  build: {
    outDir: '../assets/dist',
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: resolve(__dirname, 'src/main.js'),
      output: {
        entryFileNames: 'js/[name]-[hash].js',
        chunkFileNames: 'js/[name]-[hash].js',
        assetFileNames: (info) => {
          if (info.name && info.name.endsWith('.css')) return 'css/[name]-[hash].css';
          return 'assets/[name]-[hash][extname]';
        },
        manualChunks: {
          chart: ['lightweight-charts'],
        },
      },
    },
    cssCodeSplit: false,
    target: 'es2020',
    minify: 'esbuild',
    
  },
  css: { postcss: './postcss.config.js' },
});
