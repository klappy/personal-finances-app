import test from 'node:test';import assert from 'node:assert/strict';import {recordedFlows,aggregateFlows} from '../flows.mjs';import {empty,operate} from '../core.mjs';import {rpc} from '../tools.mjs';
test('flow composition cannot silently sum expense and settlement as the same outflow',()=>{
 const rows=[{id:'card',date:'2026-09-01',spend:100,payroll:0},{id:'bank',date:'2026-09-02',spend:0,bank_card_repayment:100},{id:'income',date:'2026-09-03',spend:0,payroll:300}];const flows=recordedFlows(rows);
 assert.equal(flows.length,3);assert.throws(()=>aggregateFlows(flows,['month','direction']),/preserve kind/);const totals=aggregateFlows(flows,['month','family']);assert.equal(totals.find(x=>x.dimensions.family==='spending').amount,100);assert.equal(totals.find(x=>x.dimensions.family==='settlement').amount,100);assert.equal(totals.find(x=>x.dimensions.family==='received').amount,300);
 assert.throws(()=>recordedFlows([{id:'bad',date:'2026-09-01',spend:NaN}]),/Invalid recorded/);
});
test('same composed collection and aggregation are exposed through MCP',async()=>{
 const s=empty();await operate(s,'import_commit',{revision:0,idempotency_key:'fixture',rows:[{source_id:'fixture',source_line:'1',transaction_id:'one',account:'fixture',merchant:'Fixture shop',date:'2026-09-01',amount:10,spend:10,source_type:'Statement',classification:{group:'Food',category:'Groceries',purpose:'Household'}}]},'fixture');
 const args={collection:'flows',scope:'home',group_by:['month','kind']},expected=await operate(s,'summarize',args),actual=await rpc({id:1,method:'tools/call',params:{name:'project',arguments:{operation:'summarize',args}}},(n,a)=>operate(s,n,a));assert.deepEqual(actual.result.structuredContent,expected);assert.equal(expected.totals[0].amount,10);assert.equal(expected.cash_balance_change_verified,false);
});

test('mixed deposit allocations remain explicitly estimated and are not counted three times',()=>{
 const flows=recordedFlows([{id:'mixed',date:'2026-09-01',spend:0,review_credit:300,work_receipt:300,inflow_role:'Mixed business income / reimbursement',business_payroll_estimate:200,reimbursement_estimate:100}]);
 assert.equal(flows.length,2);assert.equal(flows.reduce((n,r)=>n+r.amount,0),300);assert.ok(flows.every(r=>r.certainty.startsWith('estimated')));
});

test('legacy textual mixed-income annotations remain an unresolved allocation, not fabricated numeric measures',()=>{
 const flows=recordedFlows([{id:'mixed',date:'2026-09-01',amount:300,spend:0,inflow_role:'Mixed business income / reimbursement',business_payroll_estimate:'Approximately $200',reimbursement_estimate:'Just over $100'}]);assert.equal(flows.length,1);assert.equal(flows[0].kind,'mixed_business_inflow');assert.equal(flows[0].amount,300);assert.equal(flows[0].family,'review');
});
