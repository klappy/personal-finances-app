import test from 'node:test';import assert from 'node:assert/strict';import {commitmentProjection} from '../commitment-projection.mjs';
const row=(id,name,spend,purpose='Household',group='Housing')=>({id,merchant:name,description:name,date:'2026-07-01',month:'2026-07',spend,purpose,group,scope:'Household',category:name,source_refs:[{source_id:'fixture',source_line:id,source_type:'Statement'}]});
test('commitment baseline composes scoped decisions, annual reserves, offsets and provenance',()=>{
 const rows=[row('1','Mortgage',500),row('2','Cursor',120,'Business','AI')],decisions={Mortgage:{essential:true,baselineAmount:500,billingFrequency:'Monthly'},Cursor:{workEssential:true,billingFrequency:'Annual',billingCharge:120}},before=JSON.stringify({rows,decisions});
 const result=commitmentProjection(rows,['2026-07','2026-08','2026-09'],decisions,{Mortgage:100});
 const home=result.scope_totals.find(r=>r.scope==='home'),work=result.scope_totals.find(r=>r.scope==='work'),combined=result.scope_totals.find(r=>r.scope==='combined');assert.equal(home.monthly_total,500);assert.equal(home.monthly_to_cover,400);assert.equal(work.monthly_total,10);assert.equal(combined.monthly_total,510);assert.equal(result.items[1].budget_category,'AI');assert.equal(result.items[1].source_refs.length,1);assert.equal(JSON.stringify({rows,decisions}),before);
});
test('single charge is a labeled annual assumption; invalid planning amounts fail',()=>{
 const rows=[row('1','Service',120,'Business','AI')],result=commitmentProjection(rows,['2026-07']);assert.equal(result.items[0].billing_frequency,'Annual');assert.equal(result.items[0].scheduled_monthly_amount,10);assert.match(result.items[0].schedule_status,/suggests annual/);assert.throws(()=>commitmentProjection(rows,['2026-07'],{Service:{baselineAmount:-1,budgetScope:'home'}}),/Invalid planning amount/);
});

import {empty,operate} from '../core.mjs';import {rpc} from '../tools.mjs';
const snapshot={months:['2026-07'],transactions:[row('one','Mortgage',500)],overrides:{transactions:{},budgets:{},commitments:{Mortgage:{essential:true,baselineAmount:500,billingFrequency:'Monthly'}},notes:''},expected_wife_contributions:{Mortgage:100}};snapshot.transactions[0].account='Fixture account';snapshot.transactions[0].amount=500;
test('planning collection is identical through MCP, read-only and source-preserving',async()=>{
 const state=empty();await operate(state,'import_commit',{revision:0,idempotency_key:'fixture-plan',format:'dashboard_snapshot',snapshot},'fixture');const before=JSON.stringify(state),args={collection:'commitments',scope:'home'},direct=await operate(state,'summarize',args),remote=await rpc({id:1,method:'tools/call',params:{name:'project',arguments:{operation:'summarize',args}}},(n,a)=>operate(state,n,a));assert.deepEqual(remote.result.structuredContent,direct);assert.equal(direct.scope_totals.find(r=>r.scope==='home').monthly_to_cover,400);assert.equal(direct.items[0].source_refs[0].source_type,'Snapshot');assert.equal(JSON.stringify(state),before);await assert.rejects(operate(state,'summarize',{...args,hide_reimbursed:true}),/gross snapshot evidence/);
});
test('negative baseline decisions fail atomically before planning can be corrupted',async()=>{
 const state=empty();await operate(state,'import_commit',{revision:0,idempotency_key:'fixture-negative',format:'dashboard_snapshot',snapshot},'fixture');const before=JSON.stringify(state),decisions=structuredClone(snapshot.overrides);decisions.commitments.Mortgage.baselineAmount=-1;await assert.rejects(operate(state,'decision_update',{revision:state.revision,decisions},'fixture'),/Invalid commitment amount/);assert.equal(JSON.stringify(state),before);
});

import {commitmentDecision} from '../commitment-projection.mjs';
test('legacy subscription decisions survive unrelated edits and unchanged saves',async()=>{
 const legacy=structuredClone(snapshot);legacy.overrides.commitments.Mortgage='Keep';const state=empty();await operate(state,'import_commit',{revision:0,idempotency_key:'legacy-commitment',format:'dashboard_snapshot',snapshot:legacy},'fixture');
 await operate(state,'decision_update',{revision:state.revision,decisions:legacy.overrides},'fixture');
 const decisions=structuredClone(legacy.overrides);decisions.commitments.Mortgage={...commitmentDecision(decisions.commitments.Mortgage),budgetScope:'work',billingFrequency:'Monthly'};
 await operate(state,'decision_update',{revision:state.revision,decisions},'fixture');assert.equal((await operate(state,'summarize',{collection:'commitments',scope:'work'})).items[0].decision,'Keep');
 const before=JSON.stringify(state);decisions.commitments.Mortgage='Review';await assert.rejects(operate(state,'decision_update',{revision:state.revision,decisions},'fixture'),/Invalid commitment decision/);assert.equal(JSON.stringify(state),before);
});
