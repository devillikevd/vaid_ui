const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 9000;
const storageDir = path.join(__dirname, 'mock_storage');
if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  console.log(`[Mock Storage] ${req.method} ${url.pathname}`);

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('x-amz-request-id', 'mock-req-id');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Bucket check: HEAD /swastik-healthcare or /swastik-healthcare/
  const parts = url.pathname.replace(/^\/+/, '').split('/');
  const bucket = parts[0];
  const key = parts.slice(1).join('/');

  if (req.method === 'HEAD' || (req.method === 'GET' && !key)) {
    // Bucket exists
    res.writeHead(200, { 'Content-Type': 'application/xml' });
    res.end();
    return;
  }

  if (req.method === 'PUT') {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      const buffer = Buffer.concat(chunks);
      if (key) {
        const filePath = path.join(storageDir, key.replace(/\//g, path.sep));
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, buffer);
        console.log(`[Mock Storage] Saved object: ${key} (${buffer.length} bytes)`);
      }
      res.writeHead(200, {
        'ETag': '"d41d8cd98f00b204e9800998ecf8427e"',
        'Content-Length': '0'
      });
      res.end();
    });
    return;
  }

  if (req.method === 'GET' && key) {
    const filePath = path.join(storageDir, key.replace(/\//g, path.sep));
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Length': data.length });
      res.end(data);
    } else {
      res.writeHead(404);
      res.end();
    }
    return;
  }

  res.writeHead(200);
  res.end();
});

server.listen(PORT, () => {
  console.log(`Mock storage running on port ${PORT}`);
});
