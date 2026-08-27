import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Maps any request to /api directly to your live production Render URL
      '/api': {
        target: 'https://espotel.onrender.com', 
        changeOrigin: true,
        secure: false,
      }
    }
  }
});
