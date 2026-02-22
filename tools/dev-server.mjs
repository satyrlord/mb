import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const PORT = parseInt(process.env.DEV_PORT ?? "8080", 10);
const HOST = process.env.DEV_HOST ?? "0.0.0.0";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".mjs":  "application/javascript; charset=utf-8",
  ".ts":   "application/typescript",
  ".json": "application/json; charset=utf-8",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif":  "image/gif",
  ".svg":  "image/svg+xml",
  ".ico":  "image/x-icon",
  ".woff": "font/woff",
  ".woff2":"font/woff2",
  ".ttf":  "font/ttf",
};

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://${HOST}:${PORT}`);
  let pathname = decodeURIComponent(url.pathname);

  // default to index.html
  if (pathname === "/" || pathname === "") {
    pathname = "/index.html";
  }

  const safePath = join(ROOT, pathname);

  // prevent path traversal
  if (!safePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  // serve directory → index.html
  let filePath = safePath;
  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = join(filePath, "index.html");
  }

  if (!existsSync(filePath)) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end(`Not found: ${pathname}`);
    return;
  }

  const ext = extname(filePath).toLowerCase();
  const contentType = MIME[ext] ?? "application/octet-stream";

  res.writeHead(200, { "Content-Type": contentType });
  createReadStream(filePath).pipe(res);
});

server.listen(PORT, HOST, () => {
  console.log(`[MEMORYBLOX] Dev server running at http://localhost:${PORT}/`);
});
