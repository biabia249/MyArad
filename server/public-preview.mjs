import { createServer, request } from 'node:http';
import { readFileSync } from 'node:fs';
export function createPublicPreview({apiPort=3001,webPort=8082,publicUrlFile}) {
 return createServer((req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  let external;
  try{external=new URL(readFileSync(publicUrlFile,'utf8').trim());}catch{/* Tunnel is starting. */}
  const local=['127.0.0.1:8080','localhost:8080'];
  if(![...local,external?.host].includes(req.headers.host)||req.headers.origin&&req.headers.origin!==external?.origin&&!local.some(host=>req.headers.origin===`http://${host}`)){
   res.writeHead(403);res.end('Origin or host not allowed.');return;
  }
  const url=new URL(req.url,'http://localhost');
  // Publicly serve production web output, never the Metro debugger or repo files.
  if(/^\/(?:inspector|debugger|_expo\/debugger|\.git|\.env)(?:\/|$)/.test(url.pathname)){res.writeHead(404);res.end();return;}
  const api=/^\/api(?:\/|$)/.test(url.pathname)||/^\/auth\//.test(url.pathname)||url.pathname==='/health';
  const rawPath=api&&url.pathname.startsWith('/api')?req.url.slice(4)||'/':req.url;
  const path=rawPath.startsWith('?')?'/'+rawPath:rawPath;
  const headers={...req.headers};
  const hop=['connection','keep-alive','proxy-authenticate','proxy-authorization','te','trailer','transfer-encoding','upgrade'];
  for(const name of Object.keys(headers))if(hop.includes(name)||name==='origin'||name==='forwarded'||name.startsWith('x-forwarded-'))delete headers[name];
  headers.host=api?`127.0.0.1:${apiPort}`:req.headers.host;
  headers['x-forwarded-proto']=external&&req.headers.host===external.host?'https':'http';
  headers['x-forwarded-host']=req.headers.host;
  const upstream=request({hostname:'127.0.0.1',port:api?apiPort:webPort,path,method:req.method,headers},response=>{
   const responseHeaders={...response.headers};for(const h of hop)delete responseHeaders[h];
   res.writeHead(response.statusCode||502,responseHeaders);response.pipe(res);
  });
  upstream.setTimeout(120000,()=>upstream.destroy());
  upstream.on('error',()=>{if(!res.headersSent)res.writeHead(502,{'Content-Type':'text/plain'});res.end('MyArad is starting. Try again shortly.');});
  req.on('aborted',()=>upstream.destroy());res.on('close',()=>{if(!res.writableEnded)upstream.destroy();});req.pipe(upstream);
 });
}
if(process.argv[1]&&import.meta.url===new URL(process.argv[1],'file:').href){
 const server=createPublicPreview({apiPort:Number(process.env.MYARAD_API_PORT||3001),webPort:Number(process.env.MYARAD_WEB_PORT||8082),publicUrlFile:process.env.MYARAD_PUBLIC_URL_FILE});
 server.listen(8080,'127.0.0.1',()=>console.log('MyArad public gateway: http://127.0.0.1:8080'));
}
