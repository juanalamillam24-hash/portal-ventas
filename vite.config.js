import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// En Cloudflare Pages el sitio se sirve desde la raíz del dominio.
export default defineConfig({
  plugins: [react()],
  base: "/",
});
