// Historical context is derivative evidence, never a certified bank match or extra spending.
export function givingEvidence(trail={},allRows=[],selectedRows=[],months=[],contextRefs=[]){
 const selected=new Set(selectedRows.map(r=>r.id)),byParent=new Map();
 for(const row of allRows){const id=row.parent_transaction_id||row.id;const rows=byParent.get(id)||[];rows.push(row);byParent.set(id,rows);}
 const inPeriod=date=>typeof date==='string'&&months.includes(date.slice(0,7));
 const scopeStatus=id=>{const linked=byParent.get(id)||allRows.filter(r=>r.id===id);if(!linked.length)return 'Unresolved ledger link';const count=linked.filter(r=>selected.has(r.id)).length;return count===linked.length?'In selected scope':count===0?'Outside selected scope':'Mixed scope allocation; receipt attribution unresolved';};
 const refs=id=>{const linked=byParent.get(id)||allRows.filter(r=>r.id===id);return [...new Map(linked.flatMap(r=>r.source_refs||[]).concat(contextRefs).map(ref=>[JSON.stringify(ref),ref])).values()];};
 const receipts=[],unresolved=[],seen=new Map(),identities=new Map(),conflicts=new Set();
 for(const [index,row] of (trail.app_receipts||[]).entries()){
  const key=typeof row.id==='string'&&row.id?row.id:'context-index:'+index;
  const identity=JSON.stringify(row);if(identities.has(key)&&identities.get(key)!==identity)conflicts.add(key);else identities.set(key,identity);
  if(inPeriod(row.date)&&!seen.has(key))seen.set(key,{row,index});
 }
 for(const [key,{row,index}] of seen){
  const amountValid=Number.isFinite(row.amount)&&row.amount>=0,status=conflicts.has(key)?'Conflicting historical receipt identity':!amountValid?'Invalid historical amount':scopeStatus(row.ledger_id);
  const item={...structuredClone(row),context_index:index,attribution_status:status,reconciliation_status:'Not certified',ledger_scope_refs:refs(row.ledger_id),source_refs:structuredClone(contextRefs)};
  if(status==='In selected scope')receipts.push(item);else if(status!=='Outside selected scope')unresolved.push(item);
 }
 const funding=(trail.trail||[]).filter(row=>inPeriod(row.funding_date)).map((row,index)=>({...structuredClone(row),context_index:index,attribution_status:scopeStatus(row.funding_id),reconciliation_status:'Candidate relationships only; not certified',ledger_scope_refs:refs(row.funding_id),source_refs:structuredClone(contextRefs)})).filter(row=>row.attribution_status!=='Outside selected scope');
 const observedTotal=receipts.reduce((total,row)=>total+Math.round(row.amount*100),0)/100;
 return {receipts,unresolved_receipts:unresolved,funding_candidates:funding,receipt_count:receipts.length,observed_receipt_total:observedTotal,unresolved_receipt_count:unresolved.length,funding_candidate_count:funding.length,months:[...months],source_refs:structuredClone(contextRefs),context_custody_status:contextRefs.length?'Declared derivative context references':'Historical context custody not established',complete:false,reconciliation_status:'Not certified',status:'Observed historical receipt evidence; ledger links establish scope only. Funding candidates are internal transfers, not additional giving spending. Unresolved receipts are outside attributed totals.'};
}
