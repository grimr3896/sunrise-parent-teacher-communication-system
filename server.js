const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.ico':'image/x-icon'};
http.createServer((req,res)=>{
  const pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const requested = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const file = path.resolve(PUBLIC, requested);
  if (!file.startsWith(PUBLIC + path.sep) && file !== path.join(PUBLIC,'index.html')) { res.writeHead(403); return res.end('Forbidden'); }
  const target = fs.existsSync(file) && fs.statSync(file).isFile() ? file : path.join(PUBLIC,'index.html');
  res.writeHead(200, {'Content-Type':types[path.extname(target)] || 'application/octet-stream','Cache-Control':'no-store'});
  fs.createReadStream(target).pipe(res);
}).listen(PORT,()=>console.log(`Sunrise PTC System running at http://localhost:${PORT}`));
