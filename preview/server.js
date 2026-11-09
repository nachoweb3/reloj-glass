// Servidor estático mínimo para ver el widget en el navegador durante el desarrollo.
// Uso: node preview/server.js
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT) || 4173;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp'
};

http
  .createServer((req, res) => {
    const requested = decodeURIComponent(req.url.split('?')[0]);
    const filePath = path.join(ROOT, requested === '/' ? '/preview/demo.html' : requested);

    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403, { 'content-type': 'text/plain' }).end('forbidden');
      return;
    }

    fs.readFile(filePath, (error, buffer) => {
      if (error) {
        res.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
        return;
      }
      res.writeHead(200, {
        'content-type': TYPES[path.extname(filePath)] || 'application/octet-stream',
        'cache-control': 'no-store'
      });
      res.end(buffer);
    });
  })
  .listen(PORT, '127.0.0.1', () => {
    console.log(`preview listo en http://127.0.0.1:${PORT}/preview/demo.html`);
  });
