import test from 'node:test';import assert from 'node:assert/strict';import {empty,operate} from '../core.mjs';
const snapshot=()=>({months:['2026-09'],overrides:{transactions:{},budgets:{},commitments:{},notes:''},transactions:[{id:'one',account:'fixture',merchant:'Fixture',date:'2026-09-01',month:'2026-09',amount:100,spend:100,scope:'Household',group:'Food',category:'Groceries',purpose:'Household'}]});
test('UI-compatible decision save is authenticated revisioned and preserves immutable evidence',async()=>{
 const s=empty();await operate(s,'import_commit',{revision:0,idempotency_key:'seed',format:'dashboard_snapshot',snapshot:snapshot()},'fixture');const evidence=structuredClone(s.sources),decisions={transactions:{one:{group:'Food',category:'Eating out',purpose:'Personal'}},budgets:{Food:200},commitments:{Fixture:{budgetScope:'home'}},notes:'Fixture household plan'};
 await assert.rejects(operate(s,'decision_update',{revision:1,decisions}),/Authenticated/);const result=await operate(s,'decision_update',{revision:1,decisions},'fixture');assert.equal(result.revision,2);assert.equal((await operate(s,'query',{view:'dashboard',scope:'home'})).transactions[0].category,'Eating out');assert.deepEqual(s.sources,evidence);assert.equal(s.reviews.length,0);assert.equal(s.decision_events[0].actor,'fixture');
 const before=structuredClone(s);await assert.rejects(operate(s,'decision_update',{revision:1,decisions},'fixture'),/Revision/);await assert.rejects(operate(s,'decision_update',{revision:2,decisions:{...decisions,transactions:{missing:{spend:1}}}},'fixture'),/Unknown transaction/);assert.deepEqual(s,before);
});

test('curation cannot invent economic facts or change source fields',async()=>{
 const s=empty();await operate(s,'import_commit',{revision:0,idempotency_key:'seed',format:'dashboard_snapshot',snapshot:snapshot()},'fixture');const before=structuredClone(s);for(const change of [{spend:999},{payroll:500},{amount:999},{account:'another'}])await assert.rejects(operate(s,'decision_update',{revision:1,decisions:{transactions:{one:change},budgets:{},commitments:{},notes:''}},'fixture'),/adjustment|Immutable/);assert.deepEqual(s,before);
});
test('nested split reimbursement is validated and decision history is reconstructible',async()=>{
 const snap=snapshot();snap.overrides.transactions.one={splits:[{id:'a',spend:60},{id:'b',spend:40}]};const s=empty();await operate(s,'import_commit',{revision:0,idempotency_key:'seed',format:'dashboard_snapshot',snapshot:snap},'fixture');const bad=structuredClone(snap.overrides);bad.transactions.one.splits[0].reimbursement_status='Paid';bad.transactions.one.splits[0].reimbursement_amount=-100;await assert.rejects(operate(s,'decision_update',{revision:1,decisions:bad},'fixture'),/reimbursement/);assert.equal(s.revision,1);const valid=structuredClone(snap.overrides);valid.notes='after';await operate(s,'decision_update',{revision:1,decisions:valid},'fixture');assert.equal(s.decision_events[0].before_decisions.notes,'');assert.equal(s.decision_events[0].after_decisions.notes,'after');
});

test('removing a historical economic override also requires an explicit adjustment',async()=>{
 const snap=snapshot();snap.overrides.transactions.one={spend:0};const s=empty();await operate(s,'import_commit',{revision:0,idempotency_key:'seed',format:'dashboard_snapshot',snapshot:snap},'fixture');await assert.rejects(operate(s,'decision_update',{revision:1,decisions:{transactions:{},budgets:{},commitments:{},notes:''}},'fixture'),/explicit fact adjustment/);assert.equal(s.revision,1);
});
