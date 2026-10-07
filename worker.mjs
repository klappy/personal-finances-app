import {verifyAccessToken} from './auth.mjs';
import {d1Store} from './d1-store.mjs';
import {dispatch,rpc} from './tools.mjs';
import {VERSION} from './core.mjs';
let cachedKeys,expires=0;
const response=(body,status=200,type='application/json')=>new Response(typeof body==='string'?body:JSON.stringify(body),{status,headers:{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'}});
export default {async fetch(request,env){
 const url=new URL(request.url);if(url.hostname!==env.APP_HOSTNAME)return response({error:'Forbidden'},403);
 const token=request.headers.get('Cf-Access-Jwt-Assertion');if(!token)return response({error:'Authentication required'},401);
 try{
  if(!cachedKeys||Date.now()>expires){const res=await fetch(`https://${env.ACCESS_TEAM}/cdn-cgi/access/certs`);if(!res.ok)throw Error('Authentication unavailable');cachedKeys=(await res.json()).keys;expires=Date.now()+300000;}
  const actor=await verifyAccessToken(token,env,cachedKeys);if(!actor)return response({error:'Forbidden'},403);
  const call=d1Store(env.DB,actor);
  if(request.method==='GET'&&url.pathname==='/api/version')return response({version:VERSION});
  if(request.method==='GET'&&url.pathname==='/api/data')return response(await dispatch('query',{collection:'snapshot'},call));
  if(request.method==='POST'&&['/api/capability','/api/overrides','/mcp'].includes(url.pathname)){
   if(request.headers.has('Origin')&&request.headers.get('Origin')!==url.origin)return response({error:'Origin rejected'},403);
   if(!request.headers.get('Content-Type')?.startsWith('application/json'))return response({error:'JSON required'},415);
   const raw=await request.text();if(raw.length>1000000)return response({error:'Request too large'},413);let input;try{input=JSON.parse(raw);}catch{return response({error:'Invalid JSON'},400);}
   if(url.pathname==='/mcp'){const result=await rpc(input,call);return result?response(result):new Response(null,{status:202});}
   if(url.pathname==='/api/overrides'){const revision=Number(request.headers.get('If-Match'));if(!request.headers.has('If-Match')||!Number.isInteger(revision))return response({error:'Revision required'},428);return response(await dispatch('execute',{operation:'decision_update',args:{revision,decisions:input}},call));}
   return response(await dispatch(input.name,input.args||{},call));
  }
  // Always authorize before invoking the asset binding. Do not serve a SPA
  // fallback for unknown API, source, credential or state paths.
  if(['GET','HEAD'].includes(request.method)&&env.ASSETS&&frontendPath(url.pathname)){
   const asset=await env.ASSETS.fetch(request);
   const headers=new Headers(asset.headers);
   headers.set('Cache-Control','no-store');headers.set('X-Content-Type-Options','nosniff');headers.set('Referrer-Policy','same-origin');
   return new Response(request.method==='HEAD'?null:asset.body,{status:asset.status,headers});
  }
  return response({error:'Not found'},404);
 }catch(error){return response({error:error.message},error.message.includes('Revision')?409:400);}
}};

function frontendPath(path){
 if(['/','/index.html','/service-worker.js','/pwa/manifest.webmanifest','/pwa/icon-192.png','/pwa/icon-512.png','/pwa/icon-maskable-512.png','/pwa/icon-32.png','/pwa/apple-touch-icon.png','/pwa/social-card.png'].includes(path))return true;
 // Vite emits flat generated assets. Only declared public asset types enter
 // this namespace; private ledger data must never be an asset.
 return /^\/assets\/[A-Za-z0-9_-]+\.(?:js|css|svg|png|webp|woff2)$/.test(path);
}
