import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import vm from 'node:vm';
test('PWA manifest icons and social branding dimensions match the shipped files',async()=>{
 const manifest=JSON.parse(await fs.readFile(new URL('../public/pwa/manifest.webmanifest',import.meta.url),'utf8'));assert.equal(manifest.start_url,'/');assert.equal(manifest.scope,'/');assert.equal(manifest.display,'standalone');
 for(const icon of manifest.icons){const bytes=await fs.readFile(new URL('../public'+icon.src,import.meta.url)),[width,height]=icon.sizes.split('x').map(Number);assert.equal(bytes.readUInt32BE(16),width);assert.equal(bytes.readUInt32BE(20),height);}
 const social=await fs.readFile(new URL('../public/pwa/social-card.png',import.meta.url));assert.equal(social.readUInt32BE(16),1200);assert.equal(social.readUInt32BE(20),630);
});
test('service worker fetches financial requests from network without using offline caches',async()=>{
 const code=await fs.readFile(new URL('../public/service-worker.js',import.meta.url),'utf8'),handlers={},calls=[];vm.runInNewContext(code,{self:{addEventListener:(name,handler)=>handlers[name]=handler},fetch:(request,options)=>{calls.push({request,options});return Promise.resolve('network response');},caches:{open:()=>{throw Error('Offline cache forbidden');}}});
 let response;const request={method:'GET',url:'https://fixture.invalid/api/data'};handlers.fetch({request,respondWith:value=>response=value});assert.equal(await response,'network response');assert.equal(calls[0].request,request);assert.equal(calls[0].options.cache,'no-store');
});

test('deployment configuration cannot bypass authentication by serving assets first',async()=>{const config=JSON.parse(await fs.readFile(new URL('../wrangler.jsonc',import.meta.url),'utf8'));assert.equal(config.assets.directory,'./dist');assert.equal(config.assets.binding,'ASSETS');assert.equal(config.assets.run_worker_first,true);assert.equal(config.assets.not_found_handling,'none');assert.equal(config.workers_dev,false);assert.equal(config.preview_urls,false);});

test('development deployment targets isolated storage and its own Access audience',async()=>{const config=JSON.parse(await fs.readFile(new URL('../wrangler.jsonc',import.meta.url),'utf8')),dev=config.env.development;assert.notEqual(dev.name,config.name);assert.notEqual(dev.vars.APP_HOSTNAME,config.vars.APP_HOSTNAME);assert.notEqual(dev.vars.ACCESS_AUD,config.vars.ACCESS_AUD);assert.notEqual(dev.d1_databases[0].database_id,config.d1_databases[0].database_id);assert.equal(dev.assets.run_worker_first,true);assert.equal(dev.workers_dev,false);assert.equal(dev.preview_urls,false);});
