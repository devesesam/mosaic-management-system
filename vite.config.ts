import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  root: '.', // ensure Vite looks at root where index.html is
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: path.resolve(__dirname, 'index.html') // <- explicitly define entry file
    },
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
