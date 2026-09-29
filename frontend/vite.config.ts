import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev proxy: the backend worker serves the API at http://localhost:4000.
// In production the built bundle is served by the backend (or a static host)
// and VITE_API_BASE_URL points at the deployed API.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
