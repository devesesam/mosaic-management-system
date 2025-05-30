import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    chunkSizeWarningLimit: 600,
    target: 'esnext',
    minify: 'esbuild'
  },
  server: {
    port: 5173,
    host: true,
    strictPort: false,
    hmr: {
      overlay: false
    }
  },
  preview: {
    port: 5173,
    host: true,
    strictPort: false
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@supabase/supabase-js',
      'zustand',
      'react-dnd',
      'react-dnd-html5-backend',
      'date-fns',
      'react-hot-toast',
      'lucide-react'
    ]
  }
});
