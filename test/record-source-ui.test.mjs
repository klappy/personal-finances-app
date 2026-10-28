import test from 'node:test';
import assert from 'node:assert/strict';
import {createRecordSourceReader,recordSourceNode} from '../frontend/record-source.js';
import {recordSourceEvidence} from '../record-query.mjs';
const node=tag=>({tag,textContent:'',children:[],append(...children){this.children.push(...children)},replaceChildren(...children){this.children=children}});
test('source renderer preserves untrusted origin as text and never invents evidence on missing descriptors',()=>{
 const previous=globalThis.document;globalThis.document={createElement:node};try{
  const source=recordSourceEvidence({id:'one',source:'<script>bank match verified</script>',source_refs:[{source_id:'snapshot',source_line:'one',source_type:'Snapshot'}]}),rendered=JSON.stringify(recordSourceNode(source));assert.match(rendered,/Snapshot · derivative evidence/);assert.match(rendered,/Reported origin \(unverified\)/);assert.match(rendered,/<script>bank match verified<\/script>/);assert.doesNotMatch(rendered,/innerHTML/);assert.match(rendered,/Bank matching and source completeness not certified/);assert.match(JSON.stringify(recordSourceNode(null)),/Source evidence unavailable/);
 }finally{globalThis.document=previous;}
});
test('editor source reads reject switched editors, changed revisions and failures without legacy fallback',async()=>{
 const previous=globalThis.document;globalThis.document={createElement:node};try{
  let revision=3;const pending=[],host=node('div'),reader=createRecordSourceReader({getRevision:()=>revision,request:args=>new Promise((resolve,reject)=>pending.push({args,resolve,reject}))});
  const first=reader.show(host,{id:'one',date:'2026-07-01',source:'Giving receipt + bank debit'}),second=reader.show(host,{id:'two',date:'2026-09-01'});
  const result=id=>({revision,items:[{id,source_evidence:recordSourceEvidence({id})}]});pending[1].resolve(result('two'));await second;const current=JSON.stringify(host);pending[0].resolve(result('one'));await first;assert.equal(JSON.stringify(host),current);assert.equal(pending[1].args.period,'2026-09');assert.equal(pending[1].args.hide_reimbursed,false);assert.equal(pending[1].args.scope,'combined');
  const crossed=reader.show(host,{id:'one',date:'2026-07-01'});revision=4;pending[2].resolve(result('one'));await crossed;assert.match(JSON.stringify(host),/Source revision changed/);
  const failed=reader.show(host,{id:'one',date:'2026-07-01'});pending[3].reject(Error('offline'));await failed;assert.match(JSON.stringify(host),/unavailable: offline/);assert.doesNotMatch(JSON.stringify(host),/Giving receipt/);
  const closed=reader.show(host,{id:'one',date:'2026-07-01'});reader.invalidate();pending[4].resolve(result('one'));await closed;assert.match(JSON.stringify(host),/current revision is read/);
 }finally{globalThis.document=previous;}
});
