// A lossless migration bridge for an existing dashboard snapshot, not a claim of raw-source completeness.
import {createHash} from 'node:crypto';
export function normalizeDashboardSnapshot(snapshot) {
 if(!snapshot||!Array.isArray(snapshot.transactions)||!Array.isArray(snapshot.months)||!snapshot.overrides||typeof snapshot.overrides!=='object')throw Error('Invalid dashboard snapshot');
 const sourceId='dashboard-snapshot:'+createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
 const seen=new Set();
 const rows=snapshot.transactions.map((r,index)=>{
  if(typeof r.id!=='string'||seen.has(r.id))throw Error('Snapshot requires unique transaction IDs');seen.add(r.id);
  return {source_id:sourceId,source_line:String(index+1),transaction_id:r.id,account:r.account,merchant:r.merchant,date:r.date,amount:r.amount,spend:r.spend,source_type:'Snapshot',classification:{group:r.group,category:r.category,purpose:r.purpose},attributes:structuredClone(r)};
 });
 const context=structuredClone(snapshot);delete context.transactions;
 return {rows,context,sourceId};
}
export function dashboardSnapshot(state) {
 if(!state.dashboard_context)throw Error('Dashboard context not migrated');
 return {...structuredClone(state.dashboard_context),transactions:Object.values(state.transactions).map(r=>({...structuredClone(r.attributes||{}),id:r.id,account:r.account,merchant:r.merchant,date:r.date,month:r.date.slice(0,7),amount:r.amount,spend:r.spend,...r.classification})),_revision:state.revision};
}
