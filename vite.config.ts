import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { adminApi } from "./vite-plugin-admin";

// base relativa: funciona igual en GitHub Pages (/repogithub/), Vercel o servidor local.
export default defineConfig({
  base: "./",
  plugins: [react(), adminApi()],
  server: { host: "127.0.0.1", port: 5173 },
  // El bundle incluye los ~600 registros de /data (≈210 kB gzip): aceptable para un sitio estático.
  build: { chunkSizeWarningLimit: 1200 },
});
