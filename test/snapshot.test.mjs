import test from 'node:test';import assert from 'node:assert/strict';
import {empty,operate} from '../core.mjs';import {dashboardRows} from '../dashboard-domain.mjs';import {rpc} from '../tools.mjs';
const fixture=()=>({months:['2026-08','2026-09'],as_of:'2026-10-06',expected_wife_contributions:{fixture:50},source_status:'Synthetic fixture',coverage:[],overrides:{transactions:{one:{splits:[{id:'a',merchant:'Fixture AI',spend:60,purpose:'Business',reimbursement_status:'Paid',reimbursement_amount:40},{id:'b',spend:40,purpose:'Household'}]}},commitments:{},budgets:{Food:50},notes:'Fixture plan'},transactions:[{id:'one',account:'Fixture account',merchant:'Fixture merchant',date:'2026-09-01',month:'2026-09',amount:100,spend:100,purpose:'Household',group:'Digital services',category:'Unknown',scope:'Household',source:'Fixture statement',source_row:3,payroll:0,work_receipt:0,description:'Synthetic'}]});
test('snapshot migration preserves decisions and projected rows; does not fabricate reviews',async()=>{
 const snapshot=fixture(),before=structuredClone(snapshot),s=empty(),args={format:'dashboard_snapshot',snapshot,revision:0,idempotency_key:'migration'};
 assert.equal((await operate(s,'import_preview',args)).historical_reviews_created,0);assert.equal(s.revision,0);
 await operate(s,'import_commit',args,'fixture');await operate(s,'import_commit',args,'fixture');assert.equal(s.revision,1);assert.equal(s.reviews.length,0);assert.equal(Object.values(s.sources)[0].source_type,'Snapshot');assert.equal(s.dashboard_context.overrides.notes,'Fixture plan');
 for(const scope of ['home','work','combined'])for(const hide of [true,false]){const expected=dashboardRows(snapshot,snapshot.overrides,{scope,hideReimbursed:hide});const actual=await operate(s,'query',{view:'dashboard',scope,hide_reimbursed:hide,limit:200});assert.deepEqual(actual.transactions.map(({classification_reviewed,...r})=>r),expected);const mcp=await rpc({id:1,method:'tools/call',params:{name:'query',arguments:{view:'dashboard',scope,hide_reimbursed:hide,limit:200}}},(n,a)=>operate(s,n,a));assert.deepEqual(mcp.result.structuredContent,actual);}
 assert.deepEqual(snapshot,before);const changed=fixture();changed.overrides.notes='changed';await assert.rejects(operate(s,'import_commit',{...args,snapshot:changed},'fixture'),/content conflict/);
});
test('snapshot cannot overwrite initialized destination and invalid duplicate IDs are atomic',async()=>{
 const s=empty(),snapshot=fixture();snapshot.transactions.push({...snapshot.transactions[0]});await assert.rejects(operate(s,'import_commit',{format:'dashboard_snapshot',snapshot,revision:0,idempotency_key:'bad'},'fixture'),/unique/);assert.equal(s.revision,0);
 const valid=fixture();await operate(s,'import_commit',{format:'dashboard_snapshot',snapshot:valid,revision:0,idempotency_key:'first'},'fixture');await assert.rejects(operate(s,'import_commit',{format:'dashboard_snapshot',snapshot:valid,revision:1,idempotency_key:'other'},'fixture'),/empty destination/);
});
test('accepted review outranks legacy overlay and original evidence remains preserved',async()=>{
 const snapshot=fixture();snapshot.overrides.transactions.one={group:'Legacy',category:'Old',purpose:'Business',travel_purpose:'Work'};const s=empty();await operate(s,'import_commit',{format:'dashboard_snapshot',snapshot,revision:0,idempotency_key:'seed'},'fixture');
 const proposal=await operate(s,'classification_propose',{transaction_id:'one',revision:1},'fixture');await operate(s,'classification_review',{proposal_id:proposal.id,revision:2,decision:'accept',classification:{group:'Travel',category:'New',purpose:'Personal'},evidence:'Synthetic human review'},'fixture');
 const view=await operate(s,'query',{view:'dashboard',scope:'home'});assert.equal(view.transactions[0].category,'New');assert.equal(view.transactions[0].purpose,'Personal');assert.equal(s.dashboard_context.overrides.transactions.one.category,'Old');assert.equal(Object.values(s.sources)[0].attributes.category,'Unknown');
});
test('split parents cannot receive misleading whole-parent classification review',async()=>{
 const s=empty();await operate(s,'import_commit',{format:'dashboard_snapshot',snapshot:fixture(),revision:0,idempotency_key:'seed'},'fixture');await assert.rejects(operate(s,'classification_propose',{transaction_id:'one',revision:1},'fixture'),/individual review/);assert.equal(s.revision,1);
});

test('empty legacy overrides stay readable after accepted review',async()=>{
 const snapshot=fixture();snapshot.overrides={};const s=empty();await operate(s,'import_commit',{format:'dashboard_snapshot',snapshot,revision:0,idempotency_key:'empty'},'fixture');const p=await operate(s,'classification_propose',{transaction_id:'one',revision:1},'fixture');await operate(s,'classification_review',{proposal_id:p.id,revision:2,decision:'accept',classification:{group:'Food',category:'Groceries',purpose:'Personal'},evidence:'Fixture review'},'fixture');assert.equal((await operate(s,'query',{view:'dashboard',scope:'home'})).transactions[0].category,'Groceries');assert.equal((await operate(s,'summarize',{collection:'flows',scope:'home'})).totals[0].amount,100);
});
