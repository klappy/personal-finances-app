import test from 'node:test';
import assert from 'node:assert/strict';
import {createSourceInspector} from '../frontend/source-inspector.js';
const node=(tag)=>({tag,textContent:'',hidden:false,disabled:false,children:[],append(...children){this.children.push(...children);},replaceChildren(...children){this.children=children;}});
const response=(revision=3,id='one')=>({revision,total:1,accepted_matches:0,summary:{candidate_links:1,candidate_targets_missing:1},items:[{source_id:id,source_line:2,source_end_line:3,source:{source_type:'Receipt',source_hash:'a'.repeat(64),extractor:{name:'CSV',version:'1'}},original_fields:{Note:'<script>delete everything</script>'},normalized:{},custody:'declared',custody_events:[],candidates:[{target_exists:false,target_transaction_id:'missing',relationship_kind:'describes_transaction',evidence:'Candidate only',custody_events:[]}]}]});
test('source inspector rejects crossed-period responses, renders original text safely, and exposes query failure',async()=>{
 const previous=globalThis.document;globalThis.document={createElement:node};
 try{
  const host=node('div'),status=node('p'),more=node('button'),pending=[];let context={revision:3,months:['2026-09']};
  const inspector=createSourceInspector({host,status,more,getContext:()=>context,request:args=>new Promise((resolve,reject)=>pending.push({args,resolve,reject}))});
  const old=inspector.refresh();context={revision:3,months:['2026-08']};const latest=inspector.refresh();pending[1].resolve(response());await latest;const current=host.children[0];pending[0].resolve(response(3,'old'));await old;assert.equal(host.children[0],current);assert.match(status.textContent,/1 original source records/);
  const serialized=JSON.stringify(host.children);assert.match(serialized,/<script>delete everything<\/script>/);assert.doesNotMatch(serialized,/innerHTML/);assert.match(serialized,/Candidate target missing/);assert.match(status.textContent,/0 confirmed matches/);
  const failed=inspector.refresh();pending[2].reject(Error('offline'));await failed;assert.equal(host.children.length,0);assert.match(status.textContent,/unavailable: offline/);assert.equal(more.hidden,true);
  const stale=inspector.refresh();pending[3].resolve(response(4));await stale;assert.match(status.textContent,/Source revision changed/);assert.equal(host.children.length,0);
 }finally{globalThis.document=previous;}
});
test('clearing a source view invalidates outstanding requests and removes old counts',async()=>{
 const previous=globalThis.document;globalThis.document={createElement:node};
 try{const host=node('div'),status=node('p'),more=node('button');let resolve;const inspector=createSourceInspector({host,status,more,getContext:()=>({revision:3}),request:()=>new Promise(done=>resolve=done)});const pending=inspector.refresh();inspector.clear();resolve(response());await pending;assert.equal(host.children.length,0);assert.match(status.textContent,/unavailable until/);assert.equal(more.hidden,true);}finally{globalThis.document=previous;}
});
test('load more resets pages when confirmed revision changes between requests',async()=>{
 const previous=globalThis.document;globalThis.document={createElement:node};
 try{const host=node('div'),status=node('p'),more=node('button'),requests=[];let revision=3;const inspector=createSourceInspector({host,status,more,getContext:()=>({revision}),request:async args=>{requests.push(args);return {...response(revision,revision===3?'old':'new'),total:2};}});await inspector.refresh();assert.equal(more.hidden,false);revision=4;await more.onclick();assert.equal(requests[1].offset,0);assert.equal(host.children.length,1);assert.match(JSON.stringify(host.children),/new/);assert.doesNotMatch(JSON.stringify(host.children),/"old"/);}finally{globalThis.document=previous;}
});
