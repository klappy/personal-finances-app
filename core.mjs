import {recordedFlows,aggregateFlows} from './flows.mjs';
import {normalizeDashboardSnapshot,dashboardSnapshot} from './snapshot.mjs';
import {dashboardRows} from './dashboard-domain.mjs';
import {spendingProjection} from './projection.mjs';
import {createHash,randomUUID} from 'node:crypto';
import packageInfo from './package.json' with {type:'json'};
export const VERSION=packageInfo.version;
export const empty=()=>({revision:0,transactions:{},sources:{},proposals:{},reviews:[],imports:{}});
const fail=m=>{throw Error(m)},hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const tuple=r=>({group:r.group,category:r.category,purpose:r.purpose});
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const merchant=s=>s.toLowerCase().trim().replace(/\s+/g,' ');
function classification(c){if(!c||!['group','category','purpose'].every(k=>typeof c[k]==='string'&&c[k].length>0&&c[k].length<150)||!['Household','Personal','Business','Unresolved'].includes(c.purpose))fail('Invalid classification');return tuple(c);}
function validate(rows){if(!Array.isArray(rows)||!rows.length||rows.length>5000)fail('Import requires 1–500 rows');return rows.map(r=>{if(!r||!['source_id','source_line','transaction_id','account','merchant','date','source_type'].every(k=>typeof r[k]==='string'&&r[k].length>0&&r[k].length<300)||!/^\d{4}-\d{2}-\d{2}$/.test(r.date)||!Number.isFinite(r.amount)||!Number.isFinite(r.spend)||r.spend<0||!['Era','Statement','Receipt','Snapshot'].includes(r.source_type))fail('Invalid source row');return {...r,classification:classification(r.classification)};});}
function plan(state,rows){const draft=structuredClone(state),result={new_sources:0,new_transactions:0,replays:0};for(const r of validate(rows)){const key=JSON.stringify([r.source_id,r.source_line]);if(draft.sources[key]){if(!equal(draft.sources[key],r))fail('Conflicting immutable source line');result.replays++;continue;}const t=draft.transactions[r.transaction_id];if(t){if(t.amount!==r.amount||t.date!==r.date||t.account!==r.account)fail('Canonical link conflict');}else{draft.transactions[r.transaction_id]={id:r.transaction_id,account:r.account,merchant:r.merchant,date:r.date,amount:r.amount,spend:r.spend,classification:r.classification,...(r.attributes?{attributes:structuredClone(r.attributes)}:{})};result.new_transactions++;}draft.sources[key]=r;result.new_sources++;}return{draft,result};}
export async function operate(state,name,args={},actor=null,provider=null){
 let snapshotContext=null;
 if(args.format&&args.format!=='dashboard_snapshot')fail('Unknown import format');
 if(['import_preview','import_commit'].includes(name)&&args.format==='dashboard_snapshot'){const normalized=normalizeDashboardSnapshot(args.snapshot);args={...args,rows:normalized.rows};snapshotContext=normalized.context;}
 if(['import_preview','import_commit'].includes(name)&&!snapshotContext&&Array.isArray(args.rows)&&args.rows.length>500)fail('Import requires 1–500 rows');
 const importDigest=()=>hash(snapshotContext?{rows:args.rows,context:snapshotContext}:args.rows);
 if(name==='import_commit'&&state.imports[args.idempotency_key]){if(!actor)fail('Authenticated actor required');const previous=state.imports[args.idempotency_key];if(previous.digest!==importDigest())fail('Idempotency content conflict');return previous;}
 const mutating=['import_commit','classification_propose','classification_review'].includes(name);if(mutating){if(!actor)fail('Authenticated actor required');if(args.revision!==state.revision)fail('Revision conflict');}
 if(name==='docs')return {version:VERSION,capabilities:['docs','query','summarize','coverage','import_preview','import_commit','classification_propose','classification_review','export'],classification_contract:'finance-classification@1',automatic_acceptance:false,jev_configured:!!provider,limitations:['Normalized imports only','No direct Era refresh','No PDF extraction','No remote OAuth','Not integrated into cloud dashboard']};
 if(name==='export')return structuredClone(state);
 if(['query','summarize'].includes(name)&&args.collection==='flows'){
   const snapshot=state.dashboard_context?dashboardSnapshot(state):{months:[...new Set(Object.values(state.transactions).map(r=>r.date.slice(0,7)))],overrides:{},transactions:Object.values(state.transactions).map(r=>({...r,...r.classification,month:r.date.slice(0,7)}))};
   const rows=dashboardRows(snapshot,snapshot.overrides,{scope:args.scope,period:args.period,hideReimbursed:args.hide_reimbursed});
   const flows=recordedFlows(rows).filter(r=>(!args.account||r.account===args.account)&&(!args.month||r.month===args.month)&&(!args.purpose||r.purpose===args.purpose)&&(!args.kind||r.kind===args.kind));
   if(name==='summarize')return {collection:'flows',totals:aggregateFlows(flows,args.group_by),revision:state.revision,complete:false,cash_balance_change_verified:false};
   return {collection:'flows',items:flows.slice(Math.max(0,args.offset||0),Math.max(0,args.offset||0)+Math.min(200,Math.max(1,args.limit||100))),total:flows.length,revision:state.revision};
 }
 if(name==='query'&&args.view&&args.view!=='dashboard')fail('Unknown query view');
 if(name==='query'&&args.view==='dashboard'){const snapshot=dashboardSnapshot(state);const transactions=dashboardRows(snapshot,snapshot.overrides,{scope:args.scope,period:args.period,hideReimbursed:args.hide_reimbursed,all:args.all});return {transactions:transactions.slice(Math.max(0,args.offset||0),Math.max(0,args.offset||0)+Math.min(200,Math.max(1,args.limit||100))),total:transactions.length,revision:state.revision,source_status:snapshot.source_status,migration_source:'derived dashboard snapshot; original source completeness unverified'};}
 if(name==='query'||name==='summarize'||name==='coverage'){
  const rr=Object.values(state.transactions).filter(r=>(!args.month||r.date.startsWith(args.month))&&(!args.account||r.account===args.account)&&(!args.purpose||r.classification.purpose===args.purpose));
  if(name==='query')return{total:rr.length,transactions:rr.slice(Math.max(0,args.offset||0),Math.max(0,args.offset||0)+Math.min(200,Math.max(1,args.limit||100))),revision:state.revision};
  if(name==='summarize'&&args.view==='spending')return spendingProjection(Object.values(state.transactions),args,state.revision);
  if(name==='summarize'){if(args.view)fail('Unknown summary view');const totals={};for(const r of rr){const key=JSON.stringify([r.date.slice(0,7),r.classification.group,r.classification.category,r.classification.purpose]);totals[key]=Math.round(((totals[key]||0)+r.spend)*100)/100;}return{totals,revision:state.revision,complete:false};}
  const ids=new Set(rr.map(r=>r.id)),counts={};for(const r of Object.values(state.sources)){if(!ids.has(r.transaction_id))continue;const key=JSON.stringify([r.account,r.date.slice(0,7),r.source_type]);counts[key]=(counts[key]||0)+1;}return{counts,complete:false,counts_are_not_proof:true};
 }
 if(name==='import_preview'){if(snapshotContext&&Object.keys(state.transactions).length)fail('Snapshot migration requires empty destination');return {...plan(state,args.rows).result,...(snapshotContext?{migration_source:'derived dashboard snapshot',historical_reviews_created:0}:{} )};}
 if(name==='import_commit'){
  if(typeof args.idempotency_key!=='string'||!args.idempotency_key)fail('Idempotency key required');const digest=importDigest(),previous=state.imports[args.idempotency_key];if(previous){if(previous.digest!==digest)fail('Idempotency content conflict');return previous;}
  if(snapshotContext&&Object.keys(state.transactions).length)fail('Snapshot migration requires empty destination');
  const {draft,result}=plan(state,args.rows);if(snapshotContext)draft.dashboard_context=snapshotContext;const receipt={...result,digest,actor,created_at:new Date().toISOString()};draft.imports[args.idempotency_key]=receipt;draft.revision++;Object.assign(state,draft);return receipt;
 }
 if(name==='classification_propose'){
  const t=state.transactions[args.transaction_id];if(!t)fail('Unknown transaction');if(state.dashboard_context?.overrides?.transactions?.[t.id]?.splits||t.attributes?.splits)fail('Split allocations require individual review; parent proposal unavailable');const examples=state.reviews.filter(r=>r.status==='accepted'&&merchant(r.merchant)===merchant(t.merchant));const options=[...new Map(examples.map(r=>[JSON.stringify(r.classification),r.classification])).values()].sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
  const alignment=options.length===1?'aligned':options.length?'conflicting':'none';let proposed=options.length===1?options[0]:null,origin='history fallback',model=null;
  let inference=null,provider_error=null;const reviewed=state.reviews.filter(r=>r.status==='accepted');const candidates=[...new Map(reviewed.map(r=>[JSON.stringify(r.classification),r.classification])).values()].sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));if(provider&&candidates.length&&candidates.length<254){try{const out=await provider({contract:'finance-classification@1',merchant:t.merchant,options:[...candidates,null],examples:reviewed.slice(-100).map(r=>({id:r.id,merchant:r.merchant,classification:r.classification}))});if(!out?.model||!candidates.some(c=>equal(c,out.classification))&&out?.classification!==null)fail('Invalid provider proposal');proposed=out.classification;model=out.model;origin='Jev';inference=out;}catch{provider_error='Jev unavailable or invalid result; historical fallback retained';}}
  const p={id:randomUUID(),transaction_id:t.id,original:structuredClone(t.classification),proposed,alignment,examples:examples.map(r=>r.id),origin,model,inference,provider_error,contract:'finance-classification@1',needs_review:true,status:'pending',created_at:new Date().toISOString()};state.proposals[p.id]=p;state.revision++;return structuredClone(p);
 }
 if(name==='classification_review'){
  const p=state.proposals[args.proposal_id];if(!p||p.status!=='pending')fail('Pending proposal required');if(!['accept','reject'].includes(args.decision)||typeof args.evidence!=='string'||!args.evidence.trim())fail('Review decision and evidence required');const t=state.transactions[p.transaction_id];if(state.dashboard_context?.overrides?.transactions?.[t.id]?.splits||t.attributes?.splits)fail('Split allocations require individual review; parent review unavailable');if(!equal(t.classification,p.original))fail('Transaction changed since proposal');const c=args.decision==='accept'?classification(args.classification||p.proposed):null;const review={id:randomUUID(),proposal_id:p.id,transaction_id:t.id,merchant:t.merchant,original:structuredClone(t.classification),classification:c,status:args.decision==='accept'?'accepted':'rejected',actor,evidence:args.evidence,created_at:new Date().toISOString()};if(c)t.classification=c;p.status=review.status;state.reviews.push(review);state.revision++;return review;
 }
 fail('Unknown operation');
}
