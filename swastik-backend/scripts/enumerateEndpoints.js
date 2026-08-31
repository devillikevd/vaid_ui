const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, '..', 'routes');
let totalEndpoints = 0;
const endpoints = [];
const unauthenticated = [];
const publicFiles = ['auth', 'healthCard', 'public'];

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      scanDir(fullPath);
    } else if (file.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const relPath = path.relative(routesDir, fullPath).replace(/\\/g, '/');
      const regex = /router\.(get|post|put|patch|delete|options)\s*\(\s*['"`]([^'"`]+)['"`]/g;
      let match;
      while ((match = regex.exec(content)) !== null) {
        totalEndpoints++;
        endpoints.push({
          file: relPath,
          method: match[1].toUpperCase(),
          path: match[2],
        });
      }
    }
  }
}

scanDir(routesDir);

console.log('=== BACKEND ENDPOINT INVENTORY ===');
console.log('Total Programmatically Discovered Endpoints:', totalEndpoints);

// Group by method
const byMethod = {};
endpoints.forEach(e => {
  byMethod[e.method] = (byMethod[e.method] || 0) + 1;
});
console.log('Endpoints by Method:', byMethod);

// Group by file
const byFile = {};
endpoints.forEach(e => {
  byFile[e.file] = (byFile[e.file] || 0) + 1;
});
console.log('Endpoints by Router File:', byFile);
