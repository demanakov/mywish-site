import http from 'node:http';
import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('out');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.txt':'text/plain; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon','.woff2':'font/woff2','.mp4':'video/mp4','.webm':'video/webm','.pdf':'application/pdf','.xml':'application/xml'};
http.createServer(async(req,res)=>{
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'API доступно на сервере MyWish'}));return;}
 let file;
 try {
  file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(file!==root&&!file.startsWith(root+path.sep))throw Error('path');
  let info=await stat(file);if(info.isDirectory()){file=path.join(file,'index.html');info=await stat(file);}
  const headers={'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','Content-Length':info.size};
  res.writeHead(200,headers);if(req.method==='HEAD')res.end();else createReadStream(file).pipe(res);
 }catch{res.writeHead(404,{'Content-Type':'text/html; charset=utf-8'});createReadStream(path.join(root,'404.html')).on('error',()=>res.end('Not found')).pipe(res);}
}).listen(Number(process.env.PORT||3000),'127.0.0.1',()=>console.log(`Preview: http://127.0.0.1:${process.env.PORT||3000}`));
