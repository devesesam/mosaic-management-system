import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  optimizeDeps: {
    exclude: ['lucide-react'],
    force: true,
    esbuildOptions: {
      target: 'es2020',
      supported: { bigint: true },
      logLevel: 'error',
      logLimit: 0,
    }
  },
  build: {
    sourcemap: true,
    outDir: 'dist',
    assetsDir: 'assets',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          dateFns: ['date-fns'],
          reactDnd: ['react-dnd', 'react-dnd-html5-backend'],
        }
      }
    },
    chunkSizeWarningLimit: 1000, // Increase chunk size warning limit
  },
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  },
  clearScreen: false,
  server: {
    port: process.env.PORT || 5174,
    strictPort: false,
    watch: { 
      usePolling: true,
      interval: 1000 
    },
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    },
    fs: {
      strict: false,
      cachedChecks: false,
      allow: ['.']
    },
    hmr: {
      overlay: true,
    },
    // Increase memory limit
    middlewareMode: false
  },
  preview: {
    port: process.env.PORT || 5174,
    strictPort: false,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  }
});