import {dashboardSnapshot} from './snapshot.mjs';
import {dashboardRows} from './dashboard-domain.mjs';
const plain=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const reserved=k=>['__proto__','constructor','prototype'].includes(k);
export function validateDecisions(state,input) {
 if(!plain(input)||!['transactions','budgets','commitments'].every(k=>plain(input[k]))||typeof input.notes!=='string'||input.notes.length>20000)throw Error('Invalid decision document');
 if(Object.keys(input).some(k=>!['transactions','budgets','commitments','notes'].includes(k)))throw Error('Unknown decision field');
 const decisions=structuredClone(input),snapshot=dashboardSnapshot(state);
 const ids=new Set(snapshot.transactions.flatMap(r=>[r.id,...(snapshot.overrides.transactions?.[r.id]?.splits||r.splits||[]).map(x=>x.id)]));
 for(const [id,entry] of Object.entries(decisions.transactions)){if(reserved(id)||!ids.has(id)||!plain(entry))throw Error('Unknown transaction decision');for(const [field,value] of Object.entries(entry)){if(reserved(field)||['id','account','account_key','date','month','amount','source','source_row'].includes(field))throw Error('Immutable transaction field');if(['group','category'].includes(field)&&(typeof value!=='string'||!value.length||value.length>=150))throw Error('Invalid classification');if(field==='purpose'&&!['Household','Personal','Business','Unresolved'].includes(value))throw Error('Invalid classification');if(['spend','payroll','work_receipt','bank_card_repayment','refund','review_credit','business_payroll_estimate','reimbursement_estimate','reimbursement_amount'].includes(field)&&(!Number.isFinite(value)||value<0))throw Error('Invalid financial decision');}}
 for(const [key,value] of Object.entries(decisions.budgets)){if(reserved(key)||!Number.isFinite(value)||value<0)throw Error('Invalid budget target');}
 for(const [key,value] of Object.entries(decisions.commitments)){if(reserved(key)||!plain(value))throw Error('Invalid commitment decision');if(value.budgetScope&&!['home','work'].includes(value.budgetScope))throw Error('Invalid budget scope');for(const field of ['billingCharge','monthlyAmount'])if(value[field]!==undefined&&(!Number.isFinite(Number(value[field]))||Number(value[field])<0))throw Error('Invalid commitment amount');}
 dashboardRows(snapshot,decisions,{scope:'combined',all:true});
 return decisions;
}
