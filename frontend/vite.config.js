import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev-server proxy means the frontend can call fetch('/api/...') without
// hardcoding the backend's port, and avoids CORS entirely in local dev
// (in production, VITE_API_URL points at the deployed backend instead).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});
