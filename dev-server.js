// Server chạy thử trên máy, không cần đăng nhập Vercel: node dev-server.js
// Đọc .env.local, phục vụ file tĩnh ở thư mục gốc và gắn api/pf.js tại /api/pf.
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
try {
  fs.readFileSync(path.join(root, '.env.local'), 'utf8').split(/\r?\n/).forEach((line) => {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  });
} catch (e) { console.warn('Không đọc được .env.local — thiếu APPS_SCRIPT_URL / APPS_TOKEN.'); }

const api = require('./api/pf');
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png',
  '.ico': 'image/x-icon', '.svg': 'image/svg+xml',
};
// Chỉ phục vụ các file của app, không lộ .env.local, api/, tests/...
const PUBLIC = /^\/(index\.html|parser\.js|habits\.js|sw\.js|favicon\.ico|manifest\.webmanifest|icons\/[\w.-]+)?$/;

http.createServer((req, res) => {
  const url = (req.url || '/').split('?')[0];
  if (url === '/api/pf') {
    let raw = '';
    req.on('data', (c) => { raw += c; if (raw.length > 1e6) req.destroy(); });
    req.on('end', () => {
      try { req.body = raw ? JSON.parse(raw) : {}; } catch (e) { req.body = null; }
      api(req, res);
    });
    return;
  }
  if (!PUBLIC.test(url)) { res.statusCode = 404; return res.end('Not found'); }
  const file = path.join(root, url === '/' ? 'index.html' : url);
  fs.readFile(file, (err, buf) => {
    if (err) { res.statusCode = 404; return res.end('Not found'); }
    res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    res.end(buf);
  });
}).listen(process.env.PORT || 8000, () => console.log('FamFin chạy tại http://localhost:' + (process.env.PORT || 8000)));
