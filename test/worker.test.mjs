import test from 'node:test';import assert from 'node:assert/strict';import worker from '../worker.mjs';
const env={APP_HOSTNAME:'budget.test',ACCESS_TEAM:'fixture.cloudflareaccess.com',ACCESS_AUD:'fixture-aud',ACCESS_ALLOWED_EMAILS:JSON.stringify(['alice@fixture.test'])};
const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']),jwk=await crypto.subtle.exportKey('jwk',pair.publicKey);jwk.kid='fixture';
async function token(extra={}){const h=Buffer.from(JSON.stringify({alg:'RS256',kid:'fixture'})).toString('base64url'),p=Buffer.from(JSON.stringify({iss:'https://'+env.ACCESS_TEAM,aud:[env.ACCESS_AUD],email:'alice@fixture.test',exp:Math.floor(Date.now()/1000)+60,...extra})).toString('base64url'),sig=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(h+'.'+p));return h+'.'+p+'.'+Buffer.from(sig).toString('base64url');}
test('Worker enforces exact identity and host for HTTP and MCP before touching data',async()=>{const previous=globalThis.fetch;globalThis.fetch=async()=>new Response(JSON.stringify({keys:[jwk]}));try{for(const path of ['/api/data','/mcp'])assert.equal((await worker.fetch(new Request('https://budget.test'+path),env)).status,401);assert.equal((await worker.fetch(new Request('https://other.test/api/data'),env)).status,403);for(const extra of [{email:'other@fixture.test'},{aud:['wrong']},{exp:0},{iss:'https://wrong'}])assert.equal((await worker.fetch(new Request('https://budget.test/api/data',{headers:{'Cf-Access-Jwt-Assertion':await token(extra)}}),env)).status,403);const headers={'Cf-Access-Jwt-Assertion':await token(),'Content-Type':'application/json'};assert.equal((await worker.fetch(new Request('https://budget.test/api/capability',{method:'POST',headers:{...headers,Origin:'https://other.test'},body:'{}'}),env)).status,403);const result=await worker.fetch(new Request('https://budget.test/mcp',{method:'POST',headers,body:JSON.stringify({jsonrpc:'2.0',id:1,method:'initialize'})}),env);assert.equal(result.status,200);assert.equal((await result.json()).result.serverInfo.version,(await import('../core.mjs')).VERSION);assert.equal(result.headers.get('Cache-Control'),'no-store');}finally{globalThis.fetch=previous;}});

test('frontend assets share Access authorization and cannot expose private or unknown paths',async()=>{
 const previous=globalThis.fetch;globalThis.fetch=async()=>new Response(JSON.stringify({keys:[jwk]}));
 const calls=[];const fixture={...env,ASSETS:{fetch:async request=>{calls.push(new URL(request.url).pathname);return new Response('fixture frontend',{headers:{'Content-Type':'text/html','Cache-Control':'public, max-age=86400'}});}}};
 try{
  for(const path of ['/','/assets/app-fixture.js','/pwa/manifest.webmanifest'])assert.equal((await worker.fetch(new Request('https://budget.test'+path),fixture)).status,401);
  assert.equal(calls.length,0);
  const headers={'Cf-Access-Jwt-Assertion':await token()};
  for(const path of ['/','/assets/app-fixture.js','/pwa/manifest.webmanifest','/service-worker.js','/pwa/icon-192.png','/pwa/social-card.png']){
   const res=await worker.fetch(new Request('https://budget.test'+path,{headers}),fixture);assert.equal(res.status,200);assert.equal(res.headers.get('Cache-Control'),'no-store');assert.equal(await res.text(),'fixture frontend');
  }
  const head=await worker.fetch(new Request('https://budget.test/',{method:'HEAD',headers}),fixture);assert.equal(head.status,200);assert.equal(await head.text(),'');
  const count=calls.length;
  for(const path of ['/manifest.webmanifest','/pwa/unknown.png','/pwa/ledger.json','/core-state.json','/assets/ledger.json','/assets/secret.txt','/assets/%2e%2e%2fcore-state.json','/api/unknown','/mcp','/missing'])assert.equal((await worker.fetch(new Request('https://budget.test'+path,{headers}),fixture)).status,404);
  assert.equal(calls.length,count);
  assert.equal((await worker.fetch(new Request('https://budget.test/',{headers:{'Cf-Access-Jwt-Assertion':await token({email:'other@fixture.test'})}}),fixture)).status,403);
  assert.equal(calls.length,count);
  assert.equal((await worker.fetch(new Request('https://budget.test/',{headers}),env)).status,404);
 }finally{globalThis.fetch=previous;}
});
