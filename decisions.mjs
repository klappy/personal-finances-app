import {dashboardSnapshot} from './snapshot.mjs';
import {dashboardRows,additiveMeasures} from './dashboard-domain.mjs';
const plain=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const reserved=k=>['__proto__','constructor','prototype'].includes(k);
const protectedFields=['account','account_key','date','month','amount','source','source_row','merchant'];
const curationFields=new Set(['purpose','group','category','detail','evidence','inflow_role','insurance_type','travel_purpose','travel_city','reimbursement_status','reimbursement_amount','reimbursement_report','receipt_path','source_email_id','subscription_name','splits','recorded_spend',...additiveMeasures]);
const statuses=['','Paid','Submitted','Draft','Eligible','Reimbursable','Not reimbursable','Not matched to report','Not reimbursed','Unresolved'];
export function validateDecisions(state,input) {
 if(!plain(input)||!['transactions','budgets','commitments'].every(k=>plain(input[k]))||typeof input.notes!=='string'||input.notes.length>20000)throw Error('Invalid decision document');
 if(Object.keys(input).some(k=>!['transactions','budgets','commitments','notes'].includes(k)))throw Error('Unknown decision field');
 const decisions=structuredClone(input),snapshot=dashboardSnapshot(state),previous=snapshot.overrides.transactions||{};
 const ids=new Set(snapshot.transactions.flatMap(r=>[r.id,...(previous[r.id]?.splits||r.splits||[]).map(x=>x.id)]));
 const facts=new Map(snapshot.transactions.map(r=>[r.id,r]));for(const r of snapshot.transactions)for(const part of previous[r.id]?.splits||r.splits||[])facts.set(part.id,{...r,...part});
 function validateEntry(id,entry,baseline,child=false){
  if(reserved(id)||!ids.has(id)||!plain(entry))throw Error('Unknown transaction decision');
  for(const [field,value] of Object.entries(entry)){
   if(field==='classification_reviewed')throw Error('Derived review state cannot be curated');
   if(!curationFields.has(field)&&!(child&&field==='id')&&!protectedFields.includes(field)&&JSON.stringify(value)!==JSON.stringify(baseline[field]))throw Error('Unknown curation field');
   if(reserved(field)||field==='id'&&(!child||value!==id))throw Error('Immutable transaction field');
   if(protectedFields.includes(field)&&value!==baseline[field])throw Error('Immutable transaction field');
   if(['group','category'].includes(field)&&(typeof value!=='string'||!value.length||value.length>=150))throw Error('Invalid classification');
   if(field==='purpose'&&!['Household','Personal','Business','Unresolved'].includes(value))throw Error('Invalid classification');
   if(additiveMeasures.includes(field)){
    if((!Number.isFinite(value)&&!(value===baseline[field]&&typeof value==='string'))||Number(value)<0)throw Error('Invalid financial decision');
    if(!child&&value!==(baseline[field]??0))throw Error('Economic measure changes require an explicit fact adjustment');
   }
   if(field==='reimbursement_amount'&&(!Number.isFinite(value)||value<0))throw Error('Invalid reimbursement amount');
   if(field==='reimbursement_status'&&!statuses.includes(value))throw Error('Invalid reimbursement state');
   if(field==='splits'){
    if(child||!Array.isArray(value)||!value.length)throw Error('Invalid split decision');
    const oldParts=baseline.splits||[],oldIds=new Set(oldParts.map(p=>p.id));
    for(const part of value){if(!plain(part)||!oldIds.has(part.id))throw Error('Allocation creation requires a source-backed command');validateEntry(part.id,part,{...baseline,...oldParts.find(p=>p.id===part.id)},true);}
   }
  }
 }
 for(const [id,entry] of Object.entries(decisions.transactions)){if(!ids.has(id)&&Object.hasOwn(previous,id)&&JSON.stringify(entry)===JSON.stringify(previous[id]))continue;validateEntry(id,entry,{...facts.get(id),...(previous[id]||{})});}
 for(const [key,value] of Object.entries(decisions.budgets)){if(reserved(key)||!Number.isFinite(value)||value<0)throw Error('Invalid budget target');}
 for(const [key,value] of Object.entries(decisions.commitments)){if(reserved(key)||!plain(value))throw Error('Invalid commitment decision');if(value.budgetScope&&!['home','work'].includes(value.budgetScope))throw Error('Invalid budget scope');for(const field of ['billingCharge','monthlyAmount'])if(value[field]!==undefined&&(!Number.isFinite(Number(value[field]))||Number(value[field])<0))throw Error('Invalid commitment amount');}
 for(const fact of snapshot.transactions){const before={...fact,...(previous[fact.id]||{})},after={...fact,...(decisions.transactions[fact.id]||{})};for(const field of additiveMeasures)if((before[field]??0)!==(after[field]??0))throw Error('Economic measure changes require an explicit fact adjustment');}
 dashboardRows(snapshot,decisions,{scope:'combined',all:true});
 return decisions;
}
