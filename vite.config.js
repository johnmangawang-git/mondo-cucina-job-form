import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5176
  },
  build: {
    outDir: 'build',
    sourcemap: false,
    // Optimize for better asset delivery without terser
    target: 'es2015',
    minify: 'esbuild', // Use esbuild instead of terser
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          utils: ['idb', 'xlsx']
        },
        // Use simpler file naming to avoid issues
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/\.(css)$/.test(assetInfo.name)) {
            return `assets/styles.[hash].${ext}`;
          }
          return `assets/[name].[hash][extname]`;
        },
        chunkFileNames: 'assets/chunk.[hash].js',
        entryFileNames: 'assets/main.[hash].js'
      }
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 600,
    // Improve build reliability and asset serving
    assetsInlineLimit: 2048,
    cssCodeSplit: false // Bundle all CSS into one file
  },
  base: './' // Use relative paths for better compatibility
})