import test from 'node:test';import assert from 'node:assert/strict';import {flowProjection} from '../flow-projection.mjs';
const flow=(month,group,amount,kind='spending_commitment')=>({month,group,amount,kind});
test('typed series conserve spending, preserve missing-month uncertainty and separate settlements',()=>{
 const report=flowProjection([flow('2026-07','Food',10.01),flow('2026-07','Housing',30.03),flow('2026-08','Food',20.02),flow('2026-07','Food',10.01,'card_settlement')],['2026-07','2026-08','2026-09']);
 const food=report.series.find(r=>r.dimensions.group==='Food'&&r.dimensions.kind==='spending_commitment');assert.equal(food.period_total,30.03);assert.equal(food.recorded_average_per_selected_month,10.01);assert.equal(food.monthly[2].recorded_total,null);assert.equal(food.verified_min_month,null);assert.equal(food.average_recorded_monthly_share_percent,62.5);assert.equal(food.share_observed_month_count,2);
 assert.equal(report.series.filter(r=>r.dimensions.kind==='spending_commitment').reduce((n,r)=>n+Math.round(r.period_total*100),0),6006);
 assert.throws(()=>flowProjection([],['2026-07'],['group']),/preserve kind/);
});

test('funding projection separates expected contributions, unresolved deposits and settlements',()=>{
 const rows=[flow('2026-07','Income',500,'payroll_received'),flow('2026-07','Work',100,'reimbursement_received'),flow('2026-07','Work',300,'mixed_business_inflow'),flow('2026-07','Food',800),flow('2026-07','Card',400,'card_settlement')];
 const result=flowProjection(rows,['2026-07','2026-08'],['kind','group'],{expected_contribution_monthly:50});
 assert.equal(result.measures.incoming_with_expected_funding.period_total,700);assert.equal(result.measures.funding_less_spending.period_total,-100);assert.equal(result.measures.unallocated_received.period_total,300);assert.equal(result.measures.expected_contribution.status,'planned; deposits not matched');assert.equal(result.measures.payroll_received.recorded_average_per_selected_month,250);
 assert.equal(flowProjection([],['2026-07']).measures.expected_contribution.status,'unknown');assert.throws(()=>flowProjection(rows,['2026-07'],['kind'],{expected_contribution_monthly:-1}),/Invalid planned/);
});

test('received measure rollups retain estimated allocation components and certainty',()=>{
 const report=flowProjection([flow('2026-07','Work',200,'estimated_payroll_allocation'),flow('2026-07','Work',100,'estimated_reimbursement_allocation'),flow('2026-07','Work',50,'payroll_received')],['2026-07']);
 assert.equal(report.measures.payroll_received.period_total,250);assert.equal(report.measures.payroll_received.recorded_component,50);assert.equal(report.measures.payroll_received.estimated_component,200);assert.match(report.measures.payroll_received.status,/estimated allocation/);assert.equal(report.measures.reimbursement_received.recorded_component,0);assert.equal(report.measures.reimbursement_received.estimated_component,100);assert.match(report.measures.reimbursement_received.status,/payment matching not certified/);
});

test('merchant/detail rollups retain missing dimension lineage and exact amounts',()=>{
 const rows=[{...flow('2026-07','Food',10.01),merchant:'Market',transaction_id:'one',source_refs:[{source_id:'fixture',source_line:'1',source_type:'Statement'}]},{...flow('2026-08','Food',20.02),merchant:'Market',transaction_id:'two',source_refs:[{source_id:'fixture',source_line:'2',source_type:'Statement'}]}];
 const result=flowProjection(rows,['2026-07','2026-08'],['kind','group','merchant','detail']);const series=result.series[0];assert.equal(series.dimensions.detail,null);assert.equal(series.period_total,30.03);assert.deepEqual(series.transaction_ids,['one','two']);assert.equal(series.source_refs.length,2);assert.deepEqual(series.monthly.map(r=>r.recorded_total),[10.01,20.02]);
});

test('classified wife funding replaces expected funding per month without including informational transfers',()=>{
 const flows=[{transaction_id:'wife',month:'2026-07',kind:'wife_funding_received',amount:150},{transaction_id:'info',month:'2026-07',kind:'informational_funding',amount:500}];
 const result=flowProjection(flows,['2026-07','2026-08'],['kind'],{expected_contribution_monthly:100});assert.equal(result.measures.wife_funding_received.period_total,150);assert.equal(result.measures.expected_contribution.period_total,200);assert.equal(result.measures.expected_contribution_remaining.period_total,100);assert.equal(result.measures.incoming_with_expected_funding.period_total,250);
});

test('budget comparison uses selected evidence denominator and preserves unset categories',()=>{
 const result=flowProjection([flow('2026-07','Food',120),flow('2026-07','Income',300,'payroll_received')],['2026-07','2026-08'],['kind'],{budget_targets:{Food:80}}).budget_comparison;
 assert.equal(result.items.find(r=>r.category==='Food').recorded_average_per_selected_month,60);assert.equal(result.items.find(r=>r.category==='Housing').recorded_average_per_selected_month,null);assert.equal(result.monthly_target_total,80);assert.equal(result.payroll_funding_monthly,150);assert.equal(result.payroll_less_targets,70);assert.equal(result.planned_category_count,1);
});

import {empty,operate} from '../core.mjs';import {rpc} from '../tools.mjs';
test('saved budget targets compose through MCP without changing the ledger',async()=>{
 const snapshot={months:['2026-07','2026-08'],transactions:[{id:'one',account:'Fixture',merchant:'Fixture market',date:'2026-07-01',month:'2026-07',amount:120,spend:120,scope:'Household',purpose:'Household',group:'Food',category:'Groceries'}],overrides:{transactions:{},budgets:{Food:80},commitments:{},notes:''}};
 const state=empty();await operate(state,'import_commit',{revision:0,idempotency_key:'budget-fixture',format:'dashboard_snapshot',snapshot},'fixture');const before=JSON.stringify(state),args={collection:'flows',scope:'home',series:true},direct=await operate(state,'summarize',args),remote=await rpc({id:1,method:'tools/call',params:{name:'project',arguments:{operation:'summarize',args}}},(n,a)=>operate(state,n,a));assert.deepEqual(remote.result.structuredContent,direct);assert.equal(direct.projection.budget_comparison.monthly_target_total,80);assert.equal(direct.projection.budget_comparison.items.find(r=>r.category==='Food').recorded_average_per_selected_month,60);assert.equal(JSON.stringify(state),before);
});

test('budget payroll comparison retains allocation uncertainty and components',()=>{const result=flowProjection([flow('2026-07','Income',50,'payroll_received'),flow('2026-07','Income',200,'estimated_payroll_allocation')],['2026-07'],['kind']).budget_comparison;assert.equal(result.payroll_funding_monthly,250);assert.equal(result.payroll_recorded_monthly,50);assert.equal(result.payroll_estimated_monthly,200);assert.match(result.payroll_status,/Includes estimated allocation/);});

test('monthly chart totals preserve missing observations and separate measure kinds',()=>{
 const result=flowProjection([flow('2026-07','Food',10.01),flow('2026-07','Housing',20.02),flow('2026-07','Debt',100,'card_settlement')],['2026-07','2026-08']);assert.equal(result.monthly_kind_totals.find(r=>r.kind==='spending_commitment'&&r.month==='2026-07').recorded_total,30.03);assert.equal(result.monthly_kind_totals.find(r=>r.kind==='spending_commitment'&&r.month==='2026-08').recorded_total,null);assert.equal(result.monthly_kind_totals.find(r=>r.kind==='card_settlement'&&r.month==='2026-07').recorded_total,100);
});

test('contribution arrangements remain planning evidence separate from received funding',()=>{const result=flowProjection([],['2026-07'],['kind'],{contribution_plan:{Mortgage:100},expected_contribution_monthly:100});assert.equal(result.contribution_plan.items[0].monthly_amount,100);assert.equal(result.contribution_plan.monthly_total,100);assert.equal(result.measures.wife_funding_received.period_total,0);assert.match(result.contribution_plan.status,/do not certify/);});

test('expected funding cannot establish a comparison when a selected month lacks income evidence',()=>{
 const report=flowProjection([{kind:'spending_commitment',month:'2026-06',amount:10,transaction_id:'fixture'}],['2026-06'],['kind','group'],{expected_contribution_monthly:100});
 assert.equal(report.measures.funding_less_spending.period_total,90);assert.equal(report.funding_comparison.monthly_recorded_difference,null);assert.deepEqual(report.funding_comparison.missing_income_evidence_months,['2026-06']);assert.equal(report.funding_comparison.spendable_balance_verified,false);
 const recorded=flowProjection([{kind:'payroll_received',month:'2026-07',amount:100,transaction_id:'pay'},{kind:'spending_commitment',month:'2026-07',amount:10,transaction_id:'purchase'}],['2026-07']);assert.equal(recorded.funding_comparison.monthly_recorded_difference,90);assert.equal(recorded.funding_comparison.cash_flow_verified,false);
});

test('estimated allocations remain visible but cannot establish observed income',()=>{
 const report=flowProjection([{kind:'estimated_payroll_allocation',month:'2026-06',amount:200,transaction_id:'estimate'},{kind:'spending_commitment',month:'2026-06',amount:10,transaction_id:'purchase'}],['2026-06'],['kind','group'],{expected_contribution_monthly:100});assert.equal(report.measures.funding_less_spending.period_total,290);assert.deepEqual(report.funding_comparison.income_observed_months,[]);assert.deepEqual(report.funding_comparison.estimated_income_only_months,['2026-06']);assert.equal(report.funding_comparison.monthly_recorded_difference,null);
});
