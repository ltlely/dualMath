import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",   // ✅ important
    port: 5173,
    strictPort: true
  },
  define: {
    'import.meta.env.VITE_SOCKET_URL': JSON.stringify(
      process.env.VITE_SOCKET_URL || 'http://localhost:5050'
    )
  }
});
