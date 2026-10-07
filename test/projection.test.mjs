import test from 'node:test';
import assert from 'node:assert/strict';
import {empty,operate} from '../core.mjs';
import {rpc} from '../tools.mjs';
const row=(id,date,spend,purpose='Household',category='Groceries')=>({source_id:'synthetic',source_line:id,transaction_id:id,account:'fixture',merchant:'Fixture market',date,amount:spend,spend,source_type:'Statement',classification:{group:'Food',category,purpose}});
const args={view:'spending',months:['2026-07','2026-08','2026-09'],scope:'home'};
test('shared projection scopes, cents and missing-month uncertainty are preserved',async()=>{
 const s=empty();await operate(s,'import_commit',{revision:0,idempotency_key:'seed',rows:[row('a','2026-07-02',10.10),row('b','2026-07-03',0.20),row('c','2026-09-01',30,'Unresolved'),row('d','2026-09-01',90,'Business','Work meals')]},'fixture');
 const home=await operate(s,'summarize',args);assert.equal(home.period_total,40.30);assert.equal(home.recorded_average_per_selected_month,13.43);assert.deepEqual(home.monthly.map(m=>m.recorded_total),[10.30,null,30]);assert.equal(home.categories[0].verified_average_month,null);assert.equal(home.complete,false);
 assert.equal((await operate(s,'summarize',{...args,scope:'work'})).period_total,90);
 assert.equal((await operate(s,'summarize',{...args,scope:'combined'})).period_total,130.30);
 const result=await rpc({id:1,method:'tools/call',params:{name:'project',arguments:{operation:'summarize',args}}},(n,a)=>operate(s,n,a));assert.deepEqual(result.result.structuredContent,home);
 const before=structuredClone(s);await assert.rejects(operate(s,'summarize',{...args,months:['2026-13']}),/valid months/);assert.deepEqual(s,before);
});
test('alternate receipt source does not change projected spending',async()=>{
 const s=empty(),r=row('a','2026-07-01',40);await operate(s,'import_commit',{revision:0,idempotency_key:'feed',rows:[r]},'fixture');const before=await operate(s,'summarize',args);
 await operate(s,'import_commit',{revision:1,idempotency_key:'receipt',rows:[{...r,source_id:'receipt',source_type:'Receipt'}]},'fixture');const after=await operate(s,'summarize',args);assert.equal(after.period_total,before.period_total);assert.equal(after.record_count,1);
});
