import test from 'node:test';import assert from 'node:assert/strict';
import {dashboardRows,scopeRows,planningItems,sum,billName,purchasePlace} from '../dashboard-domain.mjs';
const fixture=(id,extra={})=>({id,merchant:'Fixture store',description:'Synthetic',date:'2026-09-01',month:'2026-09',purpose:'Household',scope:'Household',group:'Food',category:'Groceries',spend:100,...extra});
test('split and saved scope decisions survive shared projection without mutating input',()=>{
 const data={months:['2026-08','2026-09'],transactions:[fixture('apple',{subscription_name:'Fixture AI',group:'Digital services',splits:[{id:'a',merchant:'Fixture AI',spend:60,purpose:'Business'},{id:'b',merchant:'Fixture storage',spend:40}]})]},overrides={transactions:{b:{category:'Storage'}},commitments:{'Fixture AI':{budgetScope:'work'}}},before=structuredClone({data,overrides});
 const rows=dashboardRows(data,overrides,{scope:'work'});assert.equal(sum(rows,'spend'),100);assert.equal(rows[1].category,'Storage');assert.deepEqual({data,overrides},before);
 assert.equal(dashboardRows(data,overrides,{scope:'home'}).length,0);
});
test('paid reimbursement filter reduces only paid matched portions',()=>{
 const data={months:['2026-09'],transactions:[fixture('paid',{purpose:'Business',group:'AI',reimbursement_status:'Paid',reimbursement_amount:60}),fixture('submitted',{purpose:'Business',group:'AI',reimbursement_status:'Submitted',reimbursement_amount:100})]};
 assert.equal(sum(dashboardRows(data,{}, {scope:'work',hideReimbursed:true}),'spend'),140);
 assert.equal(sum(dashboardRows(data,{}, {scope:'work'}),'spend'),200);
 assert.equal(dashboardRows(data,{}, {period:'2026-08'}).length,0);
});
test('merchant aliases and planning quantities use shared helpers',()=>{
 const water=fixture('water',{merchant:'CITY OF ST CLOUD',group:'Housing',category:'Water'});assert.equal(purchasePlace(water),'Water / sewer / trash');assert.equal(billName(water),'Water / sewer / trash');
 const work=fixture('work',{purpose:'Business'});assert.deepEqual(scopeRows([water,work],'home'),[water]);assert.deepEqual(scopeRows([water,work],'work'),[work]);
 const plan=planningItems([fixture('g')],['2026-07','2026-08','2026-09']);assert.equal(plan[0].avg,100/3);assert.equal(plan[0].observedMonths,1);assert.equal(plan[0].latest,100);
});
test('split conservation prevents invented expense and inherited payroll',()=>{
 const data={months:['2026-09'],transactions:[fixture('parent',{payroll:100})]},overrides={transactions:{parent:{splits:[{id:'a',spend:60},{id:'b',spend:40}]}}};
 assert.throws(()=>dashboardRows(data,overrides),/conservation conflict: payroll/);
 overrides.transactions.parent.splits=[{id:'a',spend:60,payroll:60},{id:'b',spend:40,payroll:40}];assert.equal(sum(dashboardRows(data,overrides),'payroll'),100);
 overrides.transactions.parent.splits[1].spend=90;assert.throws(()=>dashboardRows(data,overrides),/conservation conflict: spend/);
});
test('explicit travel purpose precedes scope; reimbursement eligibility does not infer purpose',()=>{
 const data={months:['2026-09'],transactions:[fixture('work',{group:'Travel',purpose:'Personal',travel_purpose:'Work'}),fixture('eligible',{group:'Travel',purpose:'Personal',reimbursement_status:'Eligible'})]};
 assert.deepEqual(dashboardRows(data,{}, {scope:'work'}).map(r=>r.id),['work']);assert.deepEqual(dashboardRows(data,{}, {scope:'home'}).map(r=>r.id),['eligible']);
});

test('explicit saved purpose wins over old travel inference',()=>{
 const data={months:['2026-09'],transactions:[fixture('travel',{group:'Travel',travel_purpose:'Work',purpose:'Business'})]},overrides={transactions:{travel:{purpose:'Personal'}}};assert.equal(dashboardRows(data,overrides,{scope:'home'})[0].purpose,'Personal');assert.equal(dashboardRows(data,overrides,{scope:'work'}).length,0);
});
