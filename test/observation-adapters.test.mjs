import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
test('actual HTTP import and stdio MCP query/replay share immutable observation custody without ledger money',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'finance-observation-proof-')),file=path.join(dir,'state.json'),token='synthetic-observation-test-token-123456789',env={...process.env,FINANCE_STATE_FILE:file,FINANCE_HTTP_TOKEN:token,FINANCE_PORT:'18768'};
 const server=spawn(process.execPath,['http.mjs'],{cwd:new URL('..',import.meta.url),env,stdio:['ignore','pipe','pipe']});
 const request=async(name,args)=>fetch('http://127.0.0.1:18768/api/capability',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({name,args})});
 const evidence={source_id:'synthetic-original',source_type:'Receipt',source_hash:'a'.repeat(64),observed_at:'2026-10-07T12:00:00Z',extractor:{name:'synthetic',version:'1'},observations:[{source_line:2,source_end_line:2,original_fields:{Amount:'440.00'}}],candidates:[{source_line:2,target_transaction_id:'missing-bank-record',relationship_kind:'describes_transaction',evidence:'Unresolved candidate only'}]};
 const commit={operation:'import_commit',args:{format:'source_observations',evidence,revision:0,idempotency_key:'receipt-import'}};
 try{
  let ready=false;for(let n=0;n<40;n++){try{const r=await fetch('http://127.0.0.1:18768/api/capability',{method:'POST'});assert.equal(r.status,401);ready=true;break;}catch{await new Promise(resolve=>setTimeout(resolve,25));}}assert.equal(ready,true);
  const preview=await request('project',{operation:'import_preview',args:{format:'source_observations',evidence}});assert.equal(preview.status,200);assert.equal((await preview.json()).new_transactions,0);await assert.rejects(fs.stat(file),{code:'ENOENT'});
  const committed=await request('execute',commit);assert.equal(committed.status,200);const receipt=await committed.json();assert.equal(receipt.revision,1);
  const before=await fs.readFile(file,'utf8'),query=await request('query',{collection:'observations'}),expected=await query.json();assert.equal(expected.summary.candidate_targets_missing,1);assert.equal(expected.items[0].custody_events[0].observed_at,evidence.observed_at);
  const client=spawn(process.execPath,['mcp.mjs'],{cwd:new URL('..',import.meta.url),env});let output='';client.stdout.on('data',chunk=>output+=chunk);client.stdin.end([
   {id:1,method:'tools/call',params:{name:'query',arguments:{collection:'observations'}}},
   {id:2,method:'tools/call',params:{name:'execute',arguments:commit}},
   {id:3,method:'tools/call',params:{name:'query',arguments:{collection:'ledger'}}}
  ].map(message=>JSON.stringify({jsonrpc:'2.0',...message})).join('\n')+'\n');await once(client,'exit');
  const responses=output.trim().split('\n').map(line=>JSON.parse(line));assert.deepEqual(responses[0].result.structuredContent,expected);assert.deepEqual(responses[1].result.structuredContent,receipt);assert.deepEqual(responses[2].result.structuredContent.transactions,{});assert.equal(await fs.readFile(file,'utf8'),before);
  const invalid=await request('execute',{...commit,args:{...commit.args,evidence:{...evidence,source_hash:'b'.repeat(64)}}});assert.equal(invalid.status,400);assert.equal(await fs.readFile(file,'utf8'),before);
 }finally{const exited=once(server,'exit');server.kill();await exited;await fs.rm(dir,{recursive:true,force:true});}
});
