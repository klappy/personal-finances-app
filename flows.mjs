// Typed recorded measures; this does not infer cash settlement from a card purchase.
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
 const mixed=r.inflow_role==='Mixed business income / reimbursement';
 const estimated=mixed?[['business_payroll_estimate','estimated_payroll_allocation','incoming','received'],['reimbursement_estimate','estimated_reimbursement_allocation','incoming','received']]:[];
 return [...measures.filter(([field])=>!mixed||!['work_receipt','review_credit'].includes(field)),...estimated].flatMap(([field,kind,direction,family])=>{
  const value=r[field]??0;if(!Number.isFinite(value)||value<0)throw Error('Invalid recorded measure: '+field);
  return value ? [{id:r.id+':'+field,transaction_id:r.id,month:r.month||r.date.slice(0,7),account:r.account,purpose:r.purpose,group:r.group,category:r.category,kind,direction,family,amount:Math.round(value*100)/100,currency:'USD',source_field:field,source:r.source||null,evidence:r.evidence||null,certainty:field.endsWith('_estimate')?'estimated allocation; received payment matching not certified':family==='review'?'unresolved':'recorded; reconciliation not certified'}] : [];
 });});
}
export function aggregateFlows(flows, dimensions=['month','kind']) {
 const allowed=['month','kind','direction','family','purpose','group','category','account'];
 if(!Array.isArray(dimensions)||!dimensions.length||dimensions.length>allowed.length||new Set(dimensions).size!==dimensions.length||dimensions.some(x=>!allowed.includes(x)))throw Error('Invalid flow dimensions');
 // Kind/family must stay present: otherwise an expense and its settlement can be double-counted.
 if(!dimensions.includes('kind')&&!dimensions.includes('family'))throw Error('Flow aggregation must preserve kind or family');
 const totals=new Map();for(const flow of flows){const values=dimensions.map(k=>flow[k]??null),key=JSON.stringify(values);if(!totals.has(key))totals.set(key,{dimensions:Object.fromEntries(dimensions.map((k,i)=>[k,values[i]])),cents:0,count:0});const t=totals.get(key);t.cents+=Math.round(flow.amount*100);t.count++;}
 return [...totals.values()].map(({dimensions,cents,count})=>({dimensions,amount:cents/100,record_count:count}));
}
