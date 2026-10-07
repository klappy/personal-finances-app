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

test('series projection is identical through the shared HTTP/MCP dispatcher',async()=>{
 const s=empty();await operate(s,'import_commit',{revision:0,idempotency_key:'series-fixture',rows:[{source_id:'fixture',source_line:'1',transaction_id:'one',account:'fixture',merchant:'Fixture shop',date:'2026-09-01',amount:10.01,spend:10.01,source_type:'Statement',classification:{group:'Food',category:'Groceries',purpose:'Household'}}]},'fixture');
 const args={collection:'flows',scope:'home',series:true,group_by:['month','kind']},expected=await operate(s,'summarize',args),actual=await rpc({id:1,method:'tools/call',params:{name:'project',arguments:{operation:'summarize',args}}},(n,a)=>operate(s,n,a));assert.deepEqual(actual.result.structuredContent,expected);assert.equal(expected.projection.series[0].source_refs[0].source_type,'Statement');assert.deepEqual(expected.projection.series[0].transaction_ids,['one']);assert.equal(expected.projection.kind_totals[0].amount,10.01);assert.equal(expected.projection.series[0].average_recorded_monthly_share_percent,100);
});

test('merchant and subcategory rollups compose through MCP and conserve parent totals',async()=>{
 const s=empty();await operate(s,'import_commit',{revision:0,idempotency_key:'merchant-fixture',rows:[{source_id:'fixture',source_line:'1',transaction_id:'one',account:'fixture',merchant:'WAL-MART Store',date:'2026-09-01',amount:10.01,spend:10.01,source_type:'Statement',classification:{group:'Food',category:'Groceries',purpose:'Household'}},{source_id:'fixture',source_line:'2',transaction_id:'two',account:'fixture',merchant:'Walmart',date:'2026-09-02',amount:20.02,spend:20.02,source_type:'Statement',classification:{group:'Food',category:'Groceries',purpose:'Household'}}]},'fixture');
 const args={collection:'flows',scope:'home',series:true,rollups:[['kind','group','merchant'],['kind','group','category','merchant','detail']]},expected=await operate(s,'summarize',args),actual=await rpc({id:1,method:'tools/call',params:{name:'project',arguments:{operation:'summarize',args}}},(n,a)=>operate(s,n,a));assert.deepEqual(actual.result.structuredContent,expected);assert.equal(expected.rollups[0].series.length,1);const merchant=expected.rollups[0].series[0];assert.equal(merchant.dimensions.merchant,'Walmart');assert.equal(merchant.period_total,expected.projection.series[0].period_total);assert.deepEqual(merchant.transaction_ids,['one','two']);assert.equal(merchant.source_refs.length,2);assert.equal(expected.rollups[1].series[0].dimensions.detail,null);
});

test('explicit received roles replace generic incoming fields and preserve settlements',()=>{
 for(const [role,kind] of [['Earned income','earned_income_received'],['Reimbursement','reimbursement_received'],['Wife contribution','wife_funding_received'],['Tata joint-account funding','informational_funding'],['Internal transfer','internal_transfer']]){
  const rows=[{id:'incoming',date:'2026-09-01',amount:100,review_credit:100,work_receipt:100,payroll:100,bank_card_repayment:20,inflow_role:role}],before=JSON.stringify(rows),flows=recordedFlows(rows);
  assert.equal(flows.filter(r=>r.direction==='incoming').length,1);assert.equal(flows.find(r=>r.direction==='incoming').kind,kind);assert.equal(flows.find(r=>r.kind==='card_settlement').amount,20);assert.equal(JSON.stringify(rows),before);
 }
});

test('conflicting received measures require reconciliation instead of selecting the largest',()=>{assert.throws(()=>recordedFlows([{id:'bad',date:'2026-09-01',amount:100,review_credit:200,inflow_role:'Reimbursement'}]),/Conflicting classified inflow/);});

test('allocated received roles use conserved child measures rather than inherited parent amount',()=>{const flows=recordedFlows([{id:'child',parent_transaction_id:'parent',date:'2026-09-01',amount:300,review_credit:100,inflow_role:'Reimbursement'}]);assert.equal(flows[0].amount,100);});

test('unknown role names cannot select inherited classification rules',()=>{for(const inflow_role of ['constructor','toString','__proto__']){const flows=recordedFlows([{id:'unknown',date:'2026-09-01',amount:100,review_credit:100,inflow_role}]);assert.equal(flows.length,1);assert.equal(flows[0].kind,'unclassified_inflow');assert.equal(flows[0].certainty,'unresolved');}});

test('payment channel rollups keep bank purchases a subset and card settlement separate',()=>{
 const flows=recordedFlows([{id:'bank',date:'2026-09-01',account_type:'Checking',spend:10},{id:'savings',date:'2026-09-01',account_type:'Savings',spend:20},{id:'card',date:'2026-09-01',account_type:'Credit Card',spend:30},{id:'settlement',date:'2026-09-02',account_type:'Checking',bank_card_repayment:40}]);
 const totals=aggregateFlows(flows,['kind','payment_channel']);assert.equal(totals.find(r=>r.dimensions.kind==='spending_commitment'&&r.dimensions.payment_channel==='bank').amount,30);assert.equal(totals.find(r=>r.dimensions.kind==='spending_commitment'&&r.dimensions.payment_channel==='card').amount,30);assert.equal(totals.find(r=>r.dimensions.kind==='card_settlement').amount,40);
});
