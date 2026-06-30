import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { existsSync, mkdirSync, readdirSync, copyFileSync, createReadStream, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";

export default defineConfig({
  plugins: [
    tailwindcss(),
    {
      name: "icon-assets",
      configureServer(server) {
        const iconDir = resolve(__dirname, "icon");
        const mimeTypes: Record<string, string> = {
          ".svg": "image/svg+xml",
        };

        server.middlewares.use("/mb/icon", (req: IncomingMessage, res: ServerResponse, next) => {
          if (req.method !== "GET" && req.method !== "HEAD") return next();

          // Normalize request path: strip /mb/icon prefix
          const relPath = (req.url ?? "").replace(/^\//, "");
          const filePath = resolve(iconDir, relPath);

          // Prevent path traversal
          if (!filePath.startsWith(iconDir)) return next();
          if (!existsSync(filePath)) return next();
          if (statSync(filePath).isDirectory()) return next();

          const mime = mimeTypes[extname(filePath)] ?? "application/octet-stream";
          res.statusCode = 200;
          res.setHeader("Content-Type", mime);

          if (req.method === "HEAD") {
            res.end();
          } else {
            createReadStream(filePath).pipe(res);
          }
        });
      },
      closeBundle() {
        const iconSrc = resolve(__dirname, "icon");
        const iconDest = resolve(__dirname, "dist", "icon");

        if (!existsSync(iconSrc)) return;

        const copyRecursive = (src: string, dest: string): void => {
          if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
          for (const entry of readdirSync(src, { withFileTypes: true })) {
            const srcPath = join(src, entry.name);
            const destPath = join(dest, entry.name);
            if (entry.isDirectory()) {
              copyRecursive(srcPath, destPath);
            } else {
              copyFileSync(srcPath, destPath);
            }
          }
        };

        copyRecursive(iconSrc, iconDest);
      },
    },
  ],
  root: ".",
  base: "/mb/",
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
