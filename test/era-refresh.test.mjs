import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {empty,operate} from '../core.mjs';
import {dispatch,rpc} from '../tools.mjs';
import {store} from '../store.mjs';
import {d1Store} from '../d1-store.mjs';
import {collectEraRefresh,commitEraRefresh} from '../era-refresh.mjs';
import {eraRefreshLabel,refreshPeriodOptions} from '../frontend/era-refresh.js';

const policy=()=>[{account_group_key:'fixture-bank',account:'Fixture checking',account_type:'Checking',new_records_from:'2026-10-01',kinds:{Groceries:'purchase',Transfers:'internal_transfer',Payments:'card_payment',Credits:'unclassified_credit',Refunds:'refund'}}];
const raw=(id,extra={})=>({transaction_id:id,account_group_key:'fixture-bank',account_name:'Provider label',amount:-12.34,currency:'USD',description:'Fixture record',transaction_date:'2026-10-02',posted_date:'2026-10-03',is_pending:false,merchant_name:'Fixture merchant',category:'Groceries',is_cash_outflow:true,...extra});
const response=rows=>({history_window_applied:false,warnings:[],transactions:rows,pagination:{current_page:1,page_size:100,total_items:rows.length,total_pages:rows.length?1:0,has_more:false}});
const evidence=(rows=[raw('new')])=>({observed_at:'2026-10-28T16:00:00Z',from_date:'2026-09-24',to_date:'2026-10-28',policy:policy(),pages:[{account_group_key:'fixture-bank',request:{page:1,page_size:100,from_date:'2026-09-24',to_date:'2026-10-28'},response:response(rows)}]});
async function seed(){
 const state=empty(),snapshot={months:['2026-09'],as_of:'2026-10-06',source_status:'Historical partial snapshot',coverage:[{name:'Fixture checking',status:'Not reconciled'}],overrides:{transactions:{old:{category:'Saved category',purpose:'Household'}},budgets:{Food:400},commitments:{Fixture:{essential:true,baselineAmount:75}},notes:'Keep this'},reservations:[{label:'Existing reservation'}],account_snapshots:[{account:'Fixture checking',as_of:'2026-09-30',balance:123}],transactions:[{id:'old',account:'Fixture checking',account_key:'fixture-bank',account_type:'Checking',merchant:'Fixture old',date:'2026-09-29',month:'2026-09',amount:-12.34,spend:12.34,group:'Food',category:'Groceries',purpose:'Household',scope:'Household',reimbursement_status:'Submitted'}]};
 await operate(state,'import_commit',{format:'dashboard_snapshot',snapshot,revision:0,idempotency_key:'seed'},'fixture-owner');return state;
}
const args=(state,batch,key='run')=>({format:'era_refresh',evidence:batch,revision:state.revision,idempotency_key:key});

test('refresh preserves saved decisions, reviewed meaning, original facts and baseline; replay is unchanged',async()=>{
 const state=await seed(),old=structuredClone(state.transactions.old),context=structuredClone(state.dashboard_context);
 state.reviews.push({id:'review',transaction_id:'old',status:'accepted',classification:{group:'Food',category:'Saved category',purpose:'Household'}});
 const reviews=structuredClone(state.reviews),batch=evidence([raw('old',{transaction_date:'2026-09-29'}),raw('new')]);
 const before=JSON.stringify(state),preview=await operate(state,'import_preview',{format:'era_refresh',evidence:batch});assert.equal(preview.new_transactions,1);assert.equal(JSON.stringify(state),before);
 const receipt=await operate(state,'import_commit',args(state,batch),'fixture-scheduler');assert.equal(receipt.new_transactions,1);assert.equal(receipt.complete,false);assert.deepEqual(state.transactions.old,old);assert.deepEqual(state.reviews,reviews);
 for(const [key,value] of Object.entries(context))assert.deepEqual(state.dashboard_context[key],value);
 assert.deepEqual(state.transactions.new.classification,{group:'Needs review',category:'Needs category review',purpose:'Unresolved'});assert.equal(state.transactions.new.spend,12.34);assert.equal(state.transactions.new.attributes.reimbursement_status,undefined);
 const after=JSON.stringify(state);assert.deepEqual(await operate(state,'import_commit',args(state,batch),'fixture-scheduler'),receipt);assert.equal(JSON.stringify(state),after);
 const snapshot=await operate(state,'query',{collection:'snapshot'});assert.deepEqual(snapshot.months,['2026-09']);assert.deepEqual(snapshot.available_months,['2026-09','2026-10']);assert.equal(snapshot.as_of,'2026-10-06');assert.match(eraRefreshLabel(snapshot),/2026-10-28T16:00:00Z/);assert.match(refreshPeriodOptions(snapshot)[2].label,/October 2026.*unverified/);
 const current=await operate(state,'query',{collection:'records',period:'2026-10',scope:'combined'});assert.equal(current.total,1);
});

test('economic kinds keep transfers/card settlements distinct and do not fabricate received reimbursements',async()=>{
 const state=await seed(),batch=evidence([raw('transfer',{category:'Transfers'}),raw('settlement',{category:'Payments'}),raw('credit',{category:'Credits',amount:45,is_cash_outflow:false})]);
 await operate(state,'import_commit',args(state,batch),'fixture');assert.equal(state.transactions.transfer.spend,0);assert.equal(state.transactions.settlement.spend,0);assert.equal(state.transactions.settlement.attributes.bank_card_repayment,12.34);assert.equal(state.transactions.credit.attributes.review_credit,45);assert.equal(state.transactions.credit.attributes.work_receipt,undefined);
 const snapshot=await operate(state,'query',{collection:'snapshot'});assert.equal(snapshot.transactions.find(row=>row.id==='old').reimbursement_status,'Submitted');
});

test('empty successful fetch records freshness without claiming inactive accounts or changing a baseline',async()=>{
 const state=await seed(),count=Object.keys(state.transactions).length;const result=await operate(state,'import_commit',args(state,evidence([])),'fixture');assert.equal(result.new_transactions,0);assert.equal(result.complete,false);assert.equal(Object.keys(state.transactions).length,count);assert.deepEqual(state.dashboard_context.months,['2026-09']);
});

test('fresh run over identical facts adds custody only; manual classification changes cannot corrupt replay',async()=>{
 const state=await seed(),batch=evidence();await operate(state,'import_commit',args(state,batch),'fixture');state.transactions.new.classification={group:'Food',category:'Reviewed',purpose:'Household'};
 const next=structuredClone(batch);next.observed_at='2026-10-28T17:00:00Z';const result=await operate(state,'import_commit',args(state,next,'next'),'fixture');assert.equal(result.new_sources,0);assert.equal(result.new_transactions,0);assert.equal(state.transactions.new.classification.category,'Reviewed');
});

test('conflicting evidence, changed keys, unknown categories, old unmatched rows and stale revisions are atomic',async()=>{
 const state=await seed(),batch=evidence();await operate(state,'import_commit',args(state,batch),'fixture');const before=JSON.stringify(state);
 const changed=structuredClone(batch);changed.pages[0].response.transactions[0].amount=-14;
 await assert.rejects(operate(state,'import_commit',args(state,changed),'fixture'),/conflict/i);
 for(const bad of [evidence([raw('unknown',{category:'Unmapped'})]),evidence([raw('historic',{transaction_date:'2026-09-29'})]),evidence([raw('bad-sign',{amount:1})])])await assert.rejects(operate(state,'import_commit',args(state,bad,'other'),'fixture'));
 await assert.rejects(operate(state,'import_commit',{...args(state,evidence([raw('another')]),'new'),revision:0},'fixture'),/Revision/);assert.equal(JSON.stringify(state),before);
});

test('pagination drift, warnings, restricted history, pending rows, foreign accounts and size limits reject before mutation',async()=>{
 const state=await seed(),before=JSON.stringify(state),changes=[b=>b.pages[0].response.pagination.total_items=2,b=>b.pages[0].response.history_window_applied=true,b=>b.pages[0].response.warnings=['Reconnect required'],b=>b.pages[0].response.warnings={warning:'restricted account'},b=>b.pages[0].response.warnings=null,b=>b.pages[0].response.transactions[0].is_pending=true,b=>b.pages[0].response.transactions[0].account_group_key='not-allowed',b=>b.from_date='2026-08-01',b=>b.observed_at='2026-10-28T24:00:00Z',b=>b.pages[0].response.transactions[0].category='toString',b=>b.pages[0].response.transactions[0].description='x'.repeat(1000001)];
 for(const change of changes){const batch=evidence();change(batch);await assert.rejects(operate(state,'import_commit',args(state,batch),'fixture'));assert.equal(JSON.stringify(state),before);}
});

test('collector bounds and validates all pages before a capability write; failed read keeps last good state',async()=>{
 const state=await seed(),before=JSON.stringify(state);let writes=0,reads=0;
 const readPage=async()=>{reads++;throw Error('Connector unavailable');};
 await assert.rejects(async()=>{const batch=await collectEraRefresh({readPage,policy:policy(),from_date:'2026-09-24',to_date:'2026-10-28',observed_at:'2026-10-28T16:00:00Z'});await commitEraRefresh({call:async()=>{writes++;},evidence:batch,idempotency_key:'run'});},/unavailable/);
 assert.equal(reads,1);assert.equal(writes,0);assert.equal(JSON.stringify(state),before);
 await assert.rejects(collectEraRefresh({readPage,policy:policy(),from_date:'2020-01-01',to_date:'2026-10-28',observed_at:'2026-10-28T16:00:00Z'}),/window/);assert.equal(reads,1);
});

test('collector imports a complete multi-page run and rejects a repeated row across page boundaries',async()=>{
 const rows=Array.from({length:101},(_,index)=>raw('page-row-'+index));let reads=0;
 const batch=await collectEraRefresh({policy:policy(),from_date:'2026-09-24',to_date:'2026-10-28',observed_at:'2026-10-28T16:00:00Z',readPage:async request=>{reads++;return {history_window_applied:false,warnings:[],transactions:rows.slice((request.page-1)*100,request.page*100),pagination:{current_page:request.page,page_size:100,total_items:101,total_pages:2,has_more:request.page===1}};}});
 const state=await seed(),result=await operate(state,'import_commit',args(state,batch),'fixture');assert.equal(reads,2);assert.equal(result.new_transactions,101);
 const bad=structuredClone(batch);bad.pages[1].response.transactions[0]=bad.pages[0].response.transactions[0];const before=JSON.stringify(state);await assert.rejects(operate(state,'import_commit',args(state,bad,'repeat'),'fixture'),/repeated/);assert.equal(JSON.stringify(state),before);
});

test('actual file persistence survives uncertain response; exact staged retry does not write twice and MCP sees freshness',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'finance-refresh-test-'));
 try{
  const filename=path.join(dir,'private.json');await fs.writeFile(filename,JSON.stringify(await seed()));const invoke=store(filename,'fixture-scheduler'),call=(name,args)=>dispatch(name,args,invoke);
  const batch=await collectEraRefresh({readPage:async()=>response([raw('new')]),policy:policy(),from_date:'2026-09-24',to_date:'2026-10-28',observed_at:'2026-10-28T16:00:00Z'});let lost=true;
  await assert.rejects(commitEraRefresh({call:async(name,args)=>{const result=await call(name,args);if(name==='execute'&&lost){lost=false;throw Error('Response lost');}return result;},evidence:batch,idempotency_key:'uncertain'}),/lost/);
  const after=await fs.readFile(filename,'utf8');await commitEraRefresh({call,evidence:batch,idempotency_key:'uncertain'});assert.equal(await fs.readFile(filename,'utf8'),after);
  const result=await rpc({id:1,method:'tools/call',params:{name:'query',arguments:{collection:'snapshot'}}},invoke);assert.equal(result.result.structuredContent.era_refresh.record_count,1);assert.deepEqual(result.result.structuredContent.months,['2026-09']);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});

test('D1 losing CAS preserves the previous snapshot and never advances freshness',async()=>{
 const state=await seed(),value=JSON.stringify(state);let attempts=0;const db={prepare(){return{bind(){return this;},async first(){return{value,revision:state.revision};},async run(){attempts++;return{meta:{changes:0}};}};}};
 await assert.rejects(d1Store(db,'fixture')('import_commit',args(state,evidence())),/concurrent/);assert.equal(attempts,1);assert.equal(state.dashboard_context.era_refresh,undefined);assert.equal(JSON.stringify(state),value);
});

test('actual authenticated HTTP refresh and stdio MCP agree; retry/conflict leave persisted decisions safe',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'finance-refresh-protocol-')),file=path.join(dir,'state.json'),token='synthetic-refresh-test-token-0123456789';
 const env={PATH:process.env.PATH,FINANCE_STATE_FILE:file,FINANCE_HTTP_TOKEN:token,FINANCE_PORT:'18794'};
 await fs.writeFile(file,JSON.stringify(await seed()));
 const server=spawn(process.execPath,['http.mjs'],{cwd:new URL('..',import.meta.url),env,stdio:['ignore','pipe','pipe']});
 try{
  const post=async(name,args)=>{const result=await fetch('http://127.0.0.1:18794/api/capability',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({name,args}),signal:AbortSignal.timeout(1000)});return{status:result.status,body:await result.json()};};
  let ready=false;for(let n=0;n<40;n++){try{if((await post('docs',{})).status===200){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,25));}assert.equal(ready,true);
  const batch=evidence(),preview=await post('project',{operation:'import_preview',args:{format:'era_refresh',evidence:batch}});assert.equal(preview.status,200);
  const command={operation:'import_commit',args:{format:'era_refresh',evidence:batch,revision:preview.body.revision,idempotency_key:'protocol-run'}},saved=await post('execute',command);assert.equal(saved.status,200);
  const bytes=await fs.readFile(file,'utf8');assert.deepEqual((await post('execute',command)).body,saved.body);assert.equal(await fs.readFile(file,'utf8'),bytes);
  const changed=structuredClone(command);changed.args.evidence.pages[0].response.transactions[0].amount=-99;assert.equal((await post('execute',changed)).status,400);assert.equal(await fs.readFile(file,'utf8'),bytes);
  const expected=(await post('query',{collection:'snapshot'})).body,child=spawn(process.execPath,['mcp.mjs'],{cwd:new URL('..',import.meta.url),env,stdio:['pipe','pipe','pipe']});let output='';child.stdout.on('data',chunk=>output+=chunk);child.stdin.end(JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'query',arguments:{collection:'snapshot'}}})+'\n');await once(child,'exit');
  assert.deepEqual(JSON.parse(output.trim()).result.structuredContent,expected);assert.equal(expected.overrides.notes,'Keep this');assert.equal(expected.era_refresh.record_count,1);
 }finally{if(server.exitCode===null){server.kill();await once(server,'exit');}await fs.rm(dir,{recursive:true,force:true});}
});
