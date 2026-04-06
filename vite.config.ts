import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss()],
  root: ".",
  base: "/mb/",
  publicDir: false,
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
  },
  server: {
    port: 8080,
    host: "0.0.0.0",
  },
  preview: {
    port: 8080,
    host: "0.0.0.0",
  },
});
