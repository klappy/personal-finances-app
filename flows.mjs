import {purchasePlace} from './dashboard-domain.mjs';
// Typed recorded measures; this does not infer cash settlement from a card purchase.
const paymentChannel=r=>['Checking','Savings'].includes(r.account_type)?'bank':/credit|card/i.test(r.account_type||'')?'card':'unknown';
const measures = [
 ['spend','spending_commitment','outgoing','spending'],
 ['payroll','payroll_received','incoming','received'],
 ['work_receipt','reimbursement_received','incoming','received'],
 ['bank_card_repayment','card_settlement','outgoing','settlement'],
 ['refund','refund_recorded','incoming','adjustment'],
 ['review_credit','unclassified_inflow','incoming','review']
];
export function recordedFlows(rows) {
 return rows.flatMap(r=>{
 const roles={'Earned income':['earned_income_received','received'],'Reimbursement':['reimbursement_received','received'],'Wife contribution':['wife_funding_received','received'],'Tata joint-account funding':['informational_funding','informational'],'Internal transfer':['internal_transfer','transfer']};
 const explicit=Object.hasOwn(roles,r.inflow_role)?roles[r.inflow_role]:null;
 const incomingFields=['payroll','work_receipt','review_credit'];
 const candidates=explicit?[...incomingFields.map(field=>r[field]??0),r.parent_transaction_id?0:Math.max(0,r.amount??0)].filter(value=>value!==0):[];
 if(candidates.some(value=>!Number.isFinite(value)||value<0))throw Error('Invalid classified inflow amount');
 if(new Set(candidates.map(value=>Math.round(value*100))).size>1)throw Error('Conflicting classified inflow measures');
 const roleAmount=candidates[0]||0;
 const selectedMeasures=measures.filter(([field])=>!explicit||!incomingFields.includes(field));
 const classified=explicit&&roleAmount?[['classified_inflow',explicit[0],'incoming',explicit[1]]]:[];
 const classifiedRow=explicit?{...r,classified_inflow:roleAmount}:r;
 const mixed=r.inflow_role==='Mixed business income / reimbursement';
 const numericAllocation=mixed&&Number.isFinite(r.business_payroll_estimate)&&Number.isFinite(r.reimbursement_estimate);
 const estimated=numericAllocation?[['business_payroll_estimate','estimated_payroll_allocation','incoming','received'],['reimbursement_estimate','estimated_reimbursement_allocation','incoming','received']]:[];
 if(mixed&&!numericAllocation){const value=Math.abs(r.amount);if(!Number.isFinite(value))throw Error('Mixed inflow amount missing');return [{id:r.id+':mixed_inflow',transaction_id:r.id,month:r.month||r.date.slice(0,7),account:r.account,payment_channel:paymentChannel(r),purpose:r.purpose,group:r.group,category:r.category,merchant:r.merchant?purchasePlace(r):null,detail:r.detail??null,travel_purpose:r.travel_purpose??null,kind:'mixed_business_inflow',direction:'incoming',family:'review',amount:Math.round(value*100)/100,currency:'USD',source_field:'amount',source:r.source||null,evidence:r.evidence||null,certainty:'received amount recorded; allocation annotations are not numeric evidence'}];}
 return [...selectedMeasures.filter(([field])=>!mixed||!['work_receipt','review_credit'].includes(field)),...estimated,...classified].flatMap(([field,kind,direction,family])=>{
  const value=classifiedRow[field]??0;if(!Number.isFinite(value)||value<0)throw Error('Invalid recorded measure: '+field);
  return value ? [{id:r.id+':'+field,transaction_id:r.id,month:r.month||r.date.slice(0,7),account:r.account,payment_channel:paymentChannel(r),purpose:r.purpose,group:r.group,category:r.category,merchant:r.merchant?purchasePlace(r):null,detail:r.detail??null,travel_purpose:r.travel_purpose??null,kind,direction,family,amount:Math.round(value*100)/100,currency:'USD',source_field:field,source:r.source||null,evidence:r.evidence||null,certainty:field.endsWith('_estimate')?'estimated allocation; received payment matching not certified':family==='review'?'unresolved':'recorded; reconciliation not certified'}] : [];
 });});
}
export function aggregateFlows(flows, dimensions=['month','kind']) {
 const allowed=['month','kind','direction','family','purpose','group','category','account','merchant','detail','travel_purpose','payment_channel'];
 if(!Array.isArray(dimensions)||!dimensions.length||dimensions.length>allowed.length||new Set(dimensions).size!==dimensions.length||dimensions.some(x=>!allowed.includes(x)))throw Error('Invalid flow dimensions');
 // Kind/family must stay present: otherwise an expense and its settlement can be double-counted.
 if(!dimensions.includes('kind')&&!dimensions.includes('family'))throw Error('Flow aggregation must preserve kind or family');
 const totals=new Map();for(const flow of flows){const values=dimensions.map(k=>flow[k]??null),key=JSON.stringify(values);if(!totals.has(key))totals.set(key,{dimensions:Object.fromEntries(dimensions.map((k,i)=>[k,values[i]])),cents:0,count:0});const t=totals.get(key);t.cents+=Math.round(flow.amount*100);t.count++;}
 return [...totals.values()].map(({dimensions,cents,count})=>({dimensions,amount:cents/100,record_count:count}));
}
