import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-core': ['react', 'react-dom'],
          'data-layer': ['@supabase/supabase-js', 'zustand'],
          'dnd': ['react-dnd', 'react-dnd-html5-backend'],
          'utils': ['date-fns', 'react-hot-toast']
        }
      }
    },
    chunkSizeWarningLimit: 600
  },
  server: {
    port: 5210,
    strictPort: true,
    host: true
  },
  preview: {
    port: 5210,
    strictPort: true,
    host: true
  }
});