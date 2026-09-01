const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');

const PORT = 8080;
const ROOT = path.resolve(__dirname);
const API_TARGET = 'https://token.sensenova.cn';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.json5':'application/json; charset=utf-8',
  '.md':   'text/markdown; charset=utf-8',
  '.txt':  'text/plain; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.eot':  'application/vnd.ms-fontobject',
  '.pdf':  'application/pdf',
};

function send404(res, msg) {
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(msg || '404 Not Found');
}

function sendFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') return send404(res, '404 Not Found: ' + path.relative(ROOT, filePath));
      if (err.code === 'EISDIR') {
        const indexPath = path.join(filePath, 'index.html');
        return fs.readFile(indexPath, (e2, d2) => {
          if (e2) return send404(res);
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(d2);
        });
      }
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('500 Internal Server Error');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const ct = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': ct, 'Access-Control-Allow-Origin': '*' });
    res.end(data);
  });
}

function serveStatic(req, res) {
  const parsedUrl = new URL(req.url, 'http://localhost');
  let reqPath = decodeURIComponent(parsedUrl.pathname);
  let filePath = path.join(ROOT, reqPath);

  filePath = path.resolve(filePath);
  if (!filePath.startsWith(ROOT)) {
    return send404(res, '403 Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err) {
      return send404(res, '404 Not Found');
    }
    if (stats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
    sendFile(res, filePath);
  });
}

function handleCORS(req, res) {
  res.writeHead(204, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  });
  res.end();
}

function proxyAPI(req, res) {
  const parsedUrl = new URL(req.url, 'http://localhost');
  const targetPath = parsedUrl.pathname.replace(/^\/api\/proxy/, '') + parsedUrl.search;
  const target = API_TARGET + targetPath;

  let body = [];
  req.on('data', chunk => body.push(chunk));
  req.on('end', () => {
    body = Buffer.concat(body);

    const targetUrl = new URL(target);
    const options = {
      hostname: targetUrl.hostname,
      port: 443,
      path: targetUrl.pathname + targetUrl.search,
      method: req.method,
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/json',
        'Authorization': req.headers['authorization'] || '',
        'Content-Length': body.length,
      },
    };

    console.log('[Proxy]', req.method, targetPath);

    const proxyReq = https.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, {
        'Content-Type': proxyRes.headers['content-type'] || 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      console.error('[Proxy] Error:', err.message);
      res.writeHead(502, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ error: 'Proxy error: ' + err.message }));
    });

    if (body.length) proxyReq.write(body);
    proxyReq.end();
  });
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    return handleCORS(req, res);
  }
  if (req.url.startsWith('/api/proxy')) {
    return proxyAPI(req, res);
  }
  serveStatic(req, res);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('');
    console.error('  端口 ' + PORT + ' 已被占用，正在尝试释放...');
    const { exec } = require('child_process');
    exec('netstat -ano | findstr :' + PORT + ' | findstr LISTENING', (e, stdout) => {
      if (stdout) {
        const pid = stdout.trim().split(/\s+/).pop();
        if (pid && /^\d+$/.test(pid)) {
          exec('taskkill /PID ' + pid + ' /F', (e2) => {
            if (!e2) {
              console.log('  已终止进程 PID ' + pid + '，1秒后重试启动...');
              setTimeout(() => server.listen(PORT), 1000);
            } else {
              console.error('  无法终止进程，请手动关闭占用端口的程序后重试。');
              process.exit(1);
            }
          });
        }
      } else {
        console.error('  无法找到占用进程，请手动关闭后重试。');
        process.exit(1);
      }
    });
  } else {
    throw err;
  }
});

server.listen(PORT, () => {
  console.log('');
  console.log('  ========================================');
    console.log('    HONGHU YASI Server');
  console.log('    http://localhost:' + PORT);
  console.log('    API Proxy: /api/proxy/* -> ' + API_TARGET + '/*');
  console.log('  ========================================');
  console.log('');
});
