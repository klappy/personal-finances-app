const pathSchema={type:'array',items:{type:['string','integer']}};
const contextReferenceSchema={type:'object',additionalProperties:false,required:['source_id','source_type','source_hash','observed_at','field_path'],properties:{source_id:{type:['string','null']},source_type:{type:['string','null']},source_hash:{type:['string','null']},observed_at:{type:['string','null']},field_path:pathSchema}};
export const contextEvidenceSchema={type:'object',additionalProperties:false,required:['contract','revision','scope','months','fields','completeness_verified'],properties:{contract:{const:'context-custody@1'},revision:{type:'integer',minimum:0},scope:{const:'historical_context_unfiltered'},months:{type:'array',items:{type:'string'}},completeness_verified:{const:false},fields:{type:'array',items:{type:'object',additionalProperties:false,required:['path','presence','value','value_kind','references','conflicting_references','custody_status','label','original_source_verified','bank_match_verified'],properties:{path:pathSchema,presence:{enum:['present','missing']},value:{},value_kind:{enum:['string','number','null','other']},references:{type:'array',items:contextReferenceSchema},conflicting_references:{type:'array',items:contextReferenceSchema},custody_status:{enum:['unknown','derivative_reference','conflicting_declarations']},label:{type:'string'},original_source_verified:{const:false},bank_match_verified:{const:false}}}}}};
// Pure L5 custody projection for historical context, independent of financial filters.
const own=(value,key)=>value!==null&&typeof value==='object'&&Object.hasOwn(value,key);
const reserved=new Set(['__proto__','constructor','prototype']);
const order=(a,b)=>a<b?-1:a>b?1:0;
function read(value,path){for(const key of path){if(reserved.has(String(key))||!own(value,key))return {presence:'missing',value:null};value=value[key];}return value===undefined?{presence:'missing',value:null}:{presence:'present',value:structuredClone(value)};}
function stable(value){if(Array.isArray(value))return '['+value.map(stable).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort(order).map(key=>JSON.stringify(key)+':'+stable(value[key])).join(',')+'}';return JSON.stringify(value);}
export function contextEvidence(state){
 const context=state.dashboard_context||{},paths=[['source_status'],['as_of']];
 if(context.reference_notes&&typeof context.reference_notes==='object'&&!Array.isArray(context.reference_notes)){
  for(const key of Object.keys(context.reference_notes).sort(order))if(!reserved.has(key))paths.push(['reference_notes',key]);
 }else paths.push(['reference_notes']);
 if(Array.isArray(context.coverage))for(let index=0;index<context.coverage.length;index++){
  paths.push(['coverage',index,'name'],['coverage',index,'status']);
  const months=context.coverage[index]?.months;
  if(months&&typeof months==='object'&&!Array.isArray(months)){for(const month of [...new Set([...(Array.isArray(context.months)?context.months:[]),...Object.keys(months)])])if(typeof month==='string'&&!reserved.has(month))paths.push(['coverage',index,'months',month]);}
  else paths.push(['coverage',index,'months']);
 }else paths.push(['coverage']);
 const fields=paths.map(path=>{
  const current=read(context,path),matched=new Map(),conflicts=new Map();
  const declarations=new Map();
  // Only reference_notes is admitted by the current immutable runtime payload contract.
  if(path[0]==='reference_notes'&&path.length===2)for(const source of Object.values(state.runtime_evidence||{})){
   const candidate=read(source?.payload,path);if(candidate.presence==='missing')continue;
   const text=value=>typeof value==='string'?value:null;
   const ref={source_id:text(source?.source_id),source_type:text(source?.source_type),source_hash:text(source?.source_hash),observed_at:text(source?.observed_at),field_path:[...path]};
   const timestamp=ref.observed_at,valid=!!ref.source_id&&ref.source_type==='Snapshot'&&typeof ref.source_hash==='string'&&/^[a-f0-9]{64}$/.test(ref.source_hash)&&typeof timestamp==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(timestamp)&&Number.isFinite(Date.parse(timestamp))&&new Date(timestamp).toISOString().slice(0,10)===timestamp.slice(0,10);
   const identity=JSON.stringify([ref.source_id,path,ref.source_hash]);
   const group=declarations.get(identity)||new Map();
   const signature=stable({ref,value:candidate.value,valid});group.set(signature,{ref,value:candidate.value,valid});declarations.set(identity,group);
  }
  for(const [identity,group] of declarations){
   const inconsistent=group.size>1;
   for(const [signature,item] of group){
    const match=!inconsistent&&item.valid&&current.presence==='present'&&stable(item.value)===stable(current.value);
    (match?matched:conflicts).set(inconsistent?identity+signature:identity,structuredClone(item.ref));
   }
  }
  const references=[...matched.entries()].sort((a,b)=>order(a[0],b[0])).map(([,ref])=>ref),conflicting_references=[...conflicts.entries()].sort((a,b)=>order(a[0],b[0])).map(([,ref])=>ref);
  const custody_status=conflicting_references.length?'conflicting_declarations':references.length?'derivative_reference':'unknown';
  return {path,...current,value_kind:current.value===null?'null':typeof current.value==='string'?'string':typeof current.value==='number'?'number':'other',references,conflicting_references,custody_status,label:custody_status==='unknown'?'Historical context · original custody unknown':custody_status==='derivative_reference'?'Historical context · derivative Snapshot reference':'Historical context · conflicting declarations',original_source_verified:false,bank_match_verified:false};
 });
 return {contract:'context-custody@1',revision:state.revision,scope:'historical_context_unfiltered',months:structuredClone(Array.isArray(context.months)?context.months:[]),fields,completeness_verified:false};
}
