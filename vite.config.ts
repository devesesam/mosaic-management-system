import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
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