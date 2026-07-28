import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages sirve el sitio desde /portal-ventas/, mientras que Cloudflare y
// el servidor local lo sirven desde la raíz. El workflow de Pages define BASE.
const base = process.env.BASE || "/";

export default defineConfig({
  plugins: [react()],
  base,
});
