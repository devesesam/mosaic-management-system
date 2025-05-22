import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': [
            'react', 
            'react-dom',
            '@supabase/supabase-js',
            'zustand',
            'react-dnd',
            'react-dnd-html5-backend'
          ],
          'utils': ['date-fns', 'react-hot-toast', 'lucide-react']
        }
      }
    },
    chunkSizeWarningLimit: 600,
    target: 'esnext',
    minify: 'esbuild'
  },
  server: {
    port: 5173,
    strictPort: false,
    host: true
  },
  preview: {
    port: 5173,
    strictPort: false,
    host: true
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