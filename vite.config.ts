import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    target: 'esnext',
    minify: 'esbuild',
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      input: 'index.html', // Explicitly set index.html as the entry point
      output: {
        manualChunks: {
          vendor: [
            'react',
            'react-dom',
            '@supabase/supabase-js',
            'zustand',
            'react-dnd',
            'react-dnd-html5-backend'
          ],
          utils: ['date-fns', 'react-hot-toast', 'lucide-react']
        }
      }
    }
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