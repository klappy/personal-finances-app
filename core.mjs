import {contextEvidence,contextEvidenceSchema} from './context-evidence.mjs';
import {observationLimits,sourceObservationSchema,validateSourceObservations,planSourceObservations,querySourceObservations,observationDigestInput} from './source-observations.mjs';
import {operationDefinitions,operationRoutes} from './capability-contract.mjs';
import {classificationPurposes,prepareClassificationRequest,interpretClassificationResult} from './classification-contract.mjs';
import {accountProjection} from './account-projection.mjs';
import {validateRuntimeEvidence,planRuntimeEvidence} from './runtime-evidence.mjs';
import {recordQuery,recordSourceSchema} from './record-query.mjs';
import {evidenceProjection} from './evidence-projection.mjs';
import {givingEvidence} from './giving-evidence.mjs';
import {validateDecisions} from './decisions.mjs';
import {recordedFlows,aggregateFlows} from './flows.mjs';
import {flowProjection} from './flow-projection.mjs';
import {commitmentProjection} from './commitment-projection.mjs';
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
function classification(c){if(!c||!['group','category','purpose'].every(k=>typeof c[k]==='string'&&c[k].length>0&&c[k].length<150)||!classificationPurposes.includes(c.purpose))fail('Invalid classification');return tuple(c);}
function validate(rows){if(!Array.isArray(rows)||!rows.length||rows.length>5000)fail('Import requires 1–500 rows');return rows.map(r=>{if(!r||!['source_id','source_line','transaction_id','account','merchant','date','source_type'].every(k=>typeof r[k]==='string'&&r[k].length>0&&r[k].length<300)||!/^\d{4}-\d{2}-\d{2}$/.test(r.date)||!Number.isFinite(r.amount)||!Number.isFinite(r.spend)||r.spend<0||!['Era','Statement','Receipt','Snapshot'].includes(r.source_type))fail('Invalid source row');return {...r,classification:classification(r.classification)};});}
function plan(state,rows){const draft=structuredClone(state),result={new_sources:0,new_transactions:0,replays:0};for(const r of validate(rows)){const key=JSON.stringify([r.source_id,r.source_line]);if(draft.sources[key]){if(!equal(draft.sources[key],r))fail('Conflicting immutable source line');result.replays++;continue;}const t=draft.transactions[r.transaction_id];if(t){if(t.amount!==r.amount||t.date!==r.date||t.account!==r.account)fail('Canonical link conflict');}else{draft.transactions[r.transaction_id]={id:r.transaction_id,account:r.account,merchant:r.merchant,date:r.date,amount:r.amount,spend:r.spend,classification:r.classification,...(r.attributes?{attributes:structuredClone(r.attributes)}:{})};result.new_transactions++;}draft.sources[key]=r;result.new_sources++;}return{draft,result};}
export async function operate(state,name,args={},actor=null,provider=null){
 let snapshotContext=null,runtimeEvidence=null,sourceObservations=null;
 if(args.format&&!['dashboard_snapshot','runtime_evidence','source_observations'].includes(args.format))fail('Unknown import format');
 if(['import_preview','import_commit'].includes(name)&&args.format==='source_observations'){sourceObservations=validateSourceObservations(args.evidence);if(args.rows!==undefined||args.snapshot!==undefined)fail('Observation import cannot include canonical rows or snapshot');}
 if(['import_preview','import_commit'].includes(name)&&args.format==='runtime_evidence')runtimeEvidence=validateRuntimeEvidence(args.evidence);
 if(runtimeEvidence&&(args.rows!==undefined||args.snapshot!==undefined))fail('Runtime evidence import cannot also include transaction rows or a snapshot');
 if(['import_preview','import_commit'].includes(name)&&args.format==='dashboard_snapshot'){const normalized=normalizeDashboardSnapshot(args.snapshot);args={...args,rows:normalized.rows};snapshotContext=normalized.context;}
 if(['import_preview','import_commit'].includes(name)&&!snapshotContext&&Array.isArray(args.rows)&&args.rows.length>500)fail('Import requires 1–500 rows');
 const importDigest=()=>hash(sourceObservations?observationDigestInput(sourceObservations):runtimeEvidence|| (snapshotContext?{rows:args.rows,context:snapshotContext}:args.rows));
 if(name==='import_commit'&&state.imports[args.idempotency_key]){if(!actor)fail('Authenticated actor required');const previous=state.imports[args.idempotency_key];if(previous.digest!==importDigest())fail('Idempotency content conflict');return structuredClone(previous);}
 const mutating=['import_commit','classification_propose','classification_review','decision_update'].includes(name);if(mutating){if(!actor)fail('Authenticated actor required');if(args.revision!==state.revision)fail('Revision conflict');}
 if(sourceObservations){
  const {draft,result,batch}=planSourceObservations(state,sourceObservations);
  if(name==='import_preview')return {...result,revision:state.revision,source_id:batch.source_id,source_hash:batch.source_hash};
  if(typeof args.idempotency_key!=='string'||!args.idempotency_key||args.idempotency_key.length>300||['__proto__','constructor','prototype'].includes(args.idempotency_key))fail('Invalid observation idempotency key');
  const receipt={...result,format:'source_observations',source_id:batch.source_id,source_hash:batch.source_hash,observed_at:batch.observed_at,extractor:batch.extractor,source_lines:batch.observations.map(row=>row.source_line),candidate_ids:batch.candidates.map(row=>JSON.stringify([batch.source_id,row.source_line,row.target_transaction_id,row.relationship_kind])),actor:structuredClone(actor),created_at:new Date().toISOString(),digest:importDigest(),revision:state.revision+1};
  draft.imports[args.idempotency_key]=receipt;draft.revision++;Object.assign(state,draft);return structuredClone(receipt);
 }
 if(runtimeEvidence){
  const {draft,result}=planRuntimeEvidence(state,runtimeEvidence);
  if(name==='import_preview')return {...result,source_id:runtimeEvidence.source_id,source_hash:runtimeEvidence.source_hash,payload_hash:hash(runtimeEvidence.payload),revision:state.revision};
  if(typeof args.idempotency_key!=='string'||!args.idempotency_key||['__proto__','constructor','prototype'].includes(args.idempotency_key))fail('Invalid runtime idempotency key');
  const receipt={...result,format:'runtime_evidence',source_id:runtimeEvidence.source_id,source_hash:runtimeEvidence.source_hash,payload_hash:hash(runtimeEvidence.payload),observed_at:runtimeEvidence.observed_at,actor,created_at:new Date().toISOString(),digest:importDigest(),revision:state.revision+1};
  draft.dashboard_context.runtime_evidence_refs={...(draft.dashboard_context.runtime_evidence_refs||{}),[runtimeEvidence.source_id]:{source_id:runtimeEvidence.source_id,source_type:'Snapshot',source_hash:runtimeEvidence.source_hash,payload_hash:receipt.payload_hash,observed_at:runtimeEvidence.observed_at}};
  draft.imports[args.idempotency_key]=receipt;draft.revision++;Object.assign(state,draft);return receipt;
 }
 if(name==='docs')return structuredClone({version:VERSION,context_evidence_contract:'context-custody@1',context_evidence_schema:contextEvidenceSchema,record_source_contract:'record-source-evidence@1',record_source_schema:recordSourceSchema,source_observation_limits:observationLimits,source_observation_schema:sourceObservationSchema,capabilities:operationDefinitions.map(operation=>operation.name),operations:operationDefinitions,operation_routes:operationRoutes,classification_contract:'finance-classification@1',automatic_acceptance:false,jev_configured:!!provider,limitations:['Normalized imports only','No direct Era refresh','No PDF extraction','Remote OAuth client grant and deployed parity unverified','Production promotion and deployed parity verification pending']});
 if(name==='decision_update'){const decisions=validateDecisions(state,args.decisions);const draft=structuredClone(state);draft.dashboard_context.overrides=decisions;
  for(const [id,decision] of Object.entries(decisions.transactions)){const record=draft.transactions[id];if(record&&!decision.splits&&!record.attributes?.splits&&['group','category','purpose'].some(k=>Object.hasOwn(decision,k)))record.classification=classification({...record.classification,...Object.fromEntries(['group','category','purpose'].filter(k=>Object.hasOwn(decision,k)).map(k=>[k,decision[k]]))});}
  const event={id:randomUUID(),actor,revision:state.revision+1,created_at:new Date().toISOString(),before:hash(state.dashboard_context.overrides),after:hash(decisions),before_decisions:structuredClone(state.dashboard_context.overrides),after_decisions:structuredClone(decisions),kind:'decision_document_updated'};draft.decision_events=[...(draft.decision_events||[]),event];draft.revision++;Object.assign(state,draft);return {revision:state.revision,event_id:event.id};}
 if(name==='export'||name==='query'&&args.collection==='ledger')return structuredClone(state);
 if(name==='query'&&args.collection!=='observations'&&['source_id','source_type','original_record_id','months'].some(key=>Object.hasOwn(args,key)))fail('Observation filters require observations collection');
 if(name==='query'&&args.collection==='observations')return querySourceObservations(state,args);
 if(name==='query'&&args.collection==='snapshot'){if(Object.keys(args).some(key=>key!=='collection'))fail('Historical snapshot context is unfiltered');return {...dashboardSnapshot(state),context_evidence:contextEvidence(state)};}
 if(name==='query'&&args.collection==='records'){
  if(Object.keys(args).some(key=>!['collection','scope','period','hide_reimbursed','search','account','purpose','month','offset','limit','record_ids'].includes(key)))fail('Unsupported record query option');
  const snapshot=dashboardSnapshot(state),rows=dashboardRows(snapshot,snapshot.overrides,{scope:args.scope,period:args.period,hideReimbursed:args.hide_reimbursed}),months=args.month?[args.month]:args.period&&args.period!=='all'?[args.period]:snapshot.months;
  const sourceIndex=new Map();for(const source of Object.values(state.sources)){const refs=sourceIndex.get(source.transaction_id)||[];refs.push({source_id:source.source_id,source_line:source.source_line,source_type:source.source_type});sourceIndex.set(source.transaction_id,refs);}
  const evidence=rows.map(row=>({...row,source_refs:sourceIndex.get(row.parent_transaction_id||row.id)||[]}));
  return {...recordQuery(evidence,months,args),revision:state.revision,collection:'records'};
 }

 if(name==='summarize'&&args.collection==='accounts'){
  if(Object.keys(args).some(key=>!['collection','scope','account_type'].includes(key)))fail('Account snapshots are independent of period/reimbursement visibility');
  const snapshot=dashboardSnapshot(state),context={...snapshot,account_snapshots:(snapshot.account_snapshots||[]).map(row=>({...row,source_refs:Object.values(state.runtime_evidence||{}).filter(source=>(source.payload.account_snapshots||[]).some(item=>item.account===row.account&&item.as_of===row.as_of)).map(source=>({source_id:source.source_id,source_type:source.source_type,source_hash:source.source_hash,observed_at:source.observed_at}))}))};
  return {...accountProjection(context,args.scope,args.account_type),revision:state.revision,collection:'accounts'};
 }
 if(name==='summarize'&&args.collection==='evidence'){
  if(Object.keys(args).some(key=>!['collection','scope','period','hide_reimbursed'].includes(key)))fail('Evidence projection accepts scope, period and reimbursement visibility only');
  const snapshot=dashboardSnapshot(state),rows=dashboardRows(snapshot,snapshot.overrides,{scope:args.scope,period:args.period,hideReimbursed:args.hide_reimbursed}),months=args.period&&args.period!=='all'?[args.period]:snapshot.months;
  const sourceIndex=new Map();for(const source of Object.values(state.sources)){const refs=sourceIndex.get(source.transaction_id)||[];refs.push({source_id:source.source_id,source_line:source.source_line,source_type:source.source_type});sourceIndex.set(source.transaction_id,refs);}
  const evidence=rows.map(row=>({...row,source_refs:sourceIndex.get(row.parent_transaction_id||row.id)||[]}));
  const historySnapshot={...snapshot,months:[...new Set(snapshot.transactions.map(row=>row.date.slice(0,7)))]};
  const scopeRowsForGiving=dashboardRows(historySnapshot,snapshot.overrides,{scope:args.scope,all:true});
  const allRows=dashboardRows(historySnapshot,snapshot.overrides,{scope:'combined',all:true}).map(row=>({...row,source_refs:sourceIndex.get(row.parent_transaction_id||row.id)||[]}));
  const contextRefs=[]; // Legacy context has no field-level custody reference; do not invent one from ledger sources.
  return {...evidenceProjection(evidence,months,snapshot.original_era_monthly_counts),giving_trail:givingEvidence(snapshot.giving_trail,allRows,scopeRowsForGiving,months,contextRefs),revision:state.revision,collection:'evidence'};
 }
 if(name==='summarize'&&args.collection==='commitments'){
  if(Object.keys(args).some(key=>!['collection','scope'].includes(key)))fail('Commitment planning accepts scope only; it uses gross snapshot evidence');
  const snapshot=dashboardSnapshot(state),rows=dashboardRows(snapshot,snapshot.overrides,{scope:args.scope,all:true});
  const sourceIndex=new Map();for(const source of Object.values(state.sources)){const refs=sourceIndex.get(source.transaction_id)||[];refs.push({source_id:source.source_id,source_line:source.source_line,source_type:source.source_type});sourceIndex.set(source.transaction_id,refs);}
  const evidence=rows.map(row=>({...row,source_refs:sourceIndex.get(row.parent_transaction_id||row.id)||[]}));
  return {...commitmentProjection(evidence,snapshot.months,snapshot.overrides.commitments,snapshot.expected_wife_contributions),revision:state.revision,collection:'commitments',scope:args.scope||'combined',evidence_period:'snapshot months; gross recorded charges'};
 }
 if(['query','summarize'].includes(name)&&args.collection==='flows'){
   const snapshot=state.dashboard_context?dashboardSnapshot(state):{months:[...new Set(Object.values(state.transactions).map(r=>r.date.slice(0,7)))],overrides:{},transactions:Object.values(state.transactions).map(r=>({...r,...r.classification,month:r.date.slice(0,7)}))};
   const rows=dashboardRows(snapshot,snapshot.overrides,{scope:args.scope,period:args.period,hideReimbursed:args.hide_reimbursed});
   const rowIndex=new Map(rows.map(row=>[row.id,row])),sourceIndex=new Map();for(const source of Object.values(state.sources)){const refs=sourceIndex.get(source.transaction_id)||[];refs.push({source_id:source.source_id,source_line:source.source_line,source_type:source.source_type});sourceIndex.set(source.transaction_id,refs);}
   const flows=recordedFlows(rows).map(flow=>{const row=rowIndex.get(flow.transaction_id);return {...flow,source_refs:sourceIndex.get(row?.parent_transaction_id||flow.transaction_id)||[],classification_authority:row?.classification_reviewed?'accepted human review':'recorded classification; not certified review'};}).filter(r=>(!args.account||r.account===args.account)&&(!args.month||r.month===args.month)&&(!args.purpose||r.purpose===args.purpose)&&(!args.kind||r.kind===args.kind)&&(!args.groups||args.groups.includes(r.group)));
   if(name==='summarize'){
    const months=args.month?[args.month]:args.period&&args.period!=='all'?[args.period]:snapshot.months;
    const planning={contribution_plan:args.scope==='work'?{}:snapshot.expected_wife_contributions||{},budget_targets:snapshot.overrides?.budgets||{},expected_contribution_monthly:args.scope==='work'?0:snapshot.expected_wife_contributions?Object.values(snapshot.expected_wife_contributions).reduce((n,v)=>n+Number(v),0):null};
    return {collection:'flows',totals:aggregateFlows(flows,args.group_by),...(args.series?{projection:flowProjection(flows,months,args.series_by||['kind','group'],planning)}:{}),...(args.rollups?{rollups:args.rollups.map(dimensions=>flowProjection(flows,months,dimensions,planning))}:{}),revision:state.revision,complete:false,cash_balance_change_verified:false};
   }
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
  let inference=null,provider_error=null;const reviewed=state.reviews.filter(r=>r.status==='accepted');const candidates=[...new Map(reviewed.map(r=>[JSON.stringify(r.classification),r.classification])).values()].sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));if(provider&&candidates.length&&candidates.length<254){try{const providerOptions=[...candidates,null],request=prepareClassificationRequest({merchant:t.merchant,options:providerOptions,examples:reviewed.slice(-100).map(r=>({id:r.id,merchant:r.merchant,classification:r.classification}))}),out=interpretClassificationResult(await provider(request),providerOptions);if(!out?.model||!candidates.some(c=>equal(c,out.classification))&&out?.classification!==null)fail('Invalid provider proposal');proposed=out.classification;model=out.model;origin='Jev';inference=out;}catch{provider_error='Jev unavailable or invalid result; historical fallback retained';}}
  const p={id:randomUUID(),transaction_id:t.id,original:structuredClone(t.classification),proposed,alignment,examples:examples.map(r=>r.id),origin,model,inference,provider_error,contract:'finance-classification@1',needs_review:true,status:'pending',created_at:new Date().toISOString()};state.proposals[p.id]=p;state.revision++;return structuredClone(p);
 }
 if(name==='classification_review'){
  const p=state.proposals[args.proposal_id];if(!p||p.status!=='pending')fail('Pending proposal required');if(!['accept','reject'].includes(args.decision)||typeof args.evidence!=='string'||!args.evidence.trim())fail('Review decision and evidence required');const t=state.transactions[p.transaction_id];if(state.dashboard_context?.overrides?.transactions?.[t.id]?.splits||t.attributes?.splits)fail('Split allocations require individual review; parent review unavailable');if(!equal(t.classification,p.original))fail('Transaction changed since proposal');const c=args.decision==='accept'?classification(args.classification||p.proposed):null;const review={id:randomUUID(),proposal_id:p.id,transaction_id:t.id,merchant:t.merchant,original:structuredClone(t.classification),classification:c,status:args.decision==='accept'?'accepted':'rejected',actor,evidence:args.evidence,created_at:new Date().toISOString()};if(c)t.classification=c;p.status=review.status;state.reviews.push(review);state.revision++;return review;
 }
 fail('Unknown operation');
}
