import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer,request} from 'node:http';
import {once} from 'node:events';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createPublicPreview} from './public-preview.mjs';
test('public gateway serves app and API on one origin without exposing debugger routes',async t=>{
 const folder=await mkdtemp(join(tmpdir(),'myarad-public-'));
 const file=join(folder,'url');await writeFile(file,'https://myarad-test.trycloudflare.com');
 const servers=[];
 async function listen(s){servers.push(s);s.listen(0,'127.0.0.1');await once(s,'listening');return s.address().port;}
 t.after(async()=>{for(const server of servers.reverse()){server.closeAllConnections();await new Promise(r=>server.close(r));}await rm(folder,{recursive:true,force:true});});
 const apiPort=await listen(createServer(async(req,res)=>{let body='';for await(const chunk of req)body+=chunk;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({path:req.url,method:req.method,headers:req.headers,body}));}));
 const webPort=await listen(createServer((req,res)=>res.end('WEB:'+req.url)));
 const gatewayPort=await listen(createPublicPreview({apiPort,webPort,publicUrlFile:file}));
 const headers={Host:'myarad-test.trycloudflare.com',Origin:'https://myarad-test.trycloudflare.com'};
 const call=(path,options={})=>new Promise((resolve,reject)=>{const req=request({hostname:'127.0.0.1',port:gatewayPort,path,method:options.method||'GET',headers:{...headers,...options.headers}},res=>{let body='';res.on('data',c=>body+=c);res.on('end',()=>resolve({status:res.statusCode,text:async()=>body,json:async()=>JSON.parse(body)}));});req.on('error',reject);req.end(options.body);});
 assert.equal(await(await call('/map')).text(),'WEB:/map');
 const r=await(await call('/api/auth/signin',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer test','X-Forwarded-For':'spoofed'},body:'{"identifier":"tester"}'})).json();
 assert.equal(r.path,'/auth/signin');assert.equal(r.method,'POST');assert.equal(r.headers.authorization,'Bearer test');assert.equal(r.headers.origin,undefined);assert.equal(r.headers['x-forwarded-for'],undefined);assert.equal(r.headers['x-forwarded-proto'],'https');assert.equal(JSON.parse(r.body).identifier,'tester');
 assert.equal((await(await call('/auth/google/callback?code=test')).json()).path,'/auth/google/callback?code=test');
 assert.equal((await(await call('/health')).json()).path,'/health');
 assert.equal(await(await call('/apiary')).text(),'WEB:/apiary');
 assert.equal((await call('/api/health',{headers:{Origin:'https://untrusted.example'}})).status,403);
 assert.equal((await call('/map',{headers:{Host:'untrusted.example'}})).status,403);
 for(const path of ['/inspector','/debugger/test','/.git/config','/.env','/_expo/debugger'])assert.equal((await call(path)).status,404);
});
