// L5 document facts. Candidate links never confer acceptance or financial scope.
export const observationLimits=Object.freeze({observations:500,candidates:1000,fields:100,field_name:100,value:20000,identity:300,evidence:2000,bytes:1048576,query:200});
const stringSchema=max=>({type:'string',minLength:1,maxLength:max});
const objectSchema=(properties,required=Object.keys(properties))=>({type:'object',properties,required,additionalProperties:false});
const lineSchema={type:'integer',minimum:1,maximum:Number.MAX_SAFE_INTEGER};
const identifierSchema=stringSchema(300),explanationSchema=stringSchema(2000);
export const sourceObservationSchema=objectSchema({
 source_id:identifierSchema,source_type:{type:'string',enum:['Era','Statement','Receipt','Snapshot']},source_hash:{type:'string',pattern:'^[a-f0-9]{64}$'},observed_at:{type:'string',format:'date-time',description:'Explicit UTC timestamp, Z suffix; actual calendar date required'},
 extractor:objectSchema({name:stringSchema(300),version:stringSchema(300)}),supersedes_source_id:identifierSchema,
 observations:{type:'array',minItems:1,maxItems:500,items:objectSchema({source_line:lineSchema,source_end_line:{...lineSchema,description:'At least source_line'},original_record_id:identifierSchema,original_fields:{type:'object',maxProperties:100,propertyNames:stringSchema(100),additionalProperties:{type:'string',maxLength:20000}},normalized:objectSchema({date:objectSchema({value:{type:'string',format:'date'},meaning:{type:'string',enum:['receipt','purchase','posting']},transformation:explanationSchema}),amount:objectSchema({cents:{type:'integer',minimum:Number.MIN_SAFE_INTEGER,maximum:Number.MAX_SAFE_INTEGER},currency:{type:'string',pattern:'^[A-Z]{3}$'},sign_convention:{type:'string',enum:['charge_positive','debit_negative']},transformation:explanationSchema})},[])},['source_line','source_end_line','original_fields'])},
 candidates:{type:'array',maxItems:1000,items:objectSchema({source_line:lineSchema,target_transaction_id:identifierSchema,relationship_kind:{type:'string',enum:['describes_transaction','funding_candidate']},evidence:explanationSchema})}
},['source_id','source_type','source_hash','observed_at','extractor','observations','candidates']);
sourceObservationSchema.description='Non-additive declared source evidence; UTF-8 envelope max 1048576 bytes. Reserved keys forbidden. Source identity/hash/type/extractor/supersession immutable across batches. Candidates are never accepted matches.';
const reserved=key=>['__proto__','constructor','prototype'].includes(key);
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&[Object.prototype,null].includes(Object.getPrototypeOf(value));
const fail=message=>{throw Error(message);};
const text=(value,max)=>typeof value==='string'&&value.length>0&&value.length<=max;
const identity=value=>text(value,observationLimits.identity)&&!reserved(value);
const line=value=>Number.isSafeInteger(value)&&value>0;
const date=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
function shape(value,allowed,required=allowed){if(!plain(value)||Object.keys(value).some(key=>reserved(key)||!allowed.includes(key))||required.some(key=>!Object.hasOwn(value,key)))fail('Invalid observation schema');}
function stable(value){if(Array.isArray(value))return value.map(stable);if(plain(value))return Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])]));return value;}
export const observationDigestInput=value=>JSON.stringify(stable(value));
export function validateSourceObservations(input){
 shape(input,['source_id','source_type','source_hash','observed_at','extractor','supersedes_source_id','observations','candidates'],['source_id','source_type','source_hash','observed_at','extractor','observations','candidates']);
 if(!identity(input.source_id)||!['Era','Statement','Receipt','Snapshot'].includes(input.source_type)||typeof input.source_hash!=='string'||!/^[a-f0-9]{64}$/.test(input.source_hash)||typeof input.observed_at!=='string'||!/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?Z$/.test(input.observed_at)||!date(input.observed_at.slice(0,10)))fail('Invalid observation source custody');
 shape(input.extractor,['name','version']);if(!text(input.extractor.name,300)||!text(input.extractor.version,300))fail('Extractor name/version required');
 if(input.supersedes_source_id!==undefined&&(!identity(input.supersedes_source_id)||input.supersedes_source_id===input.source_id))fail('Invalid supersession identity');
 if(!Array.isArray(input.observations)||!input.observations.length||input.observations.length>observationLimits.observations||!Array.isArray(input.candidates)||input.candidates.length>observationLimits.candidates)fail('Observation batch limit exceeded');
 for(const row of input.observations){
  shape(row,['source_line','source_end_line','original_record_id','original_fields','normalized'],['source_line','source_end_line','original_fields']);
  if(!line(row.source_line)||!line(row.source_end_line)||row.source_end_line<row.source_line||row.original_record_id!==undefined&&!identity(row.original_record_id))fail('Invalid observation line identity');
  if(!plain(row.original_fields)||Object.keys(row.original_fields).length>observationLimits.fields)fail('Invalid original fields');
  for(const [key,value] of Object.entries(row.original_fields))if(reserved(key)||!text(key,observationLimits.field_name)||typeof value!=='string'||value.length>observationLimits.value)fail('Invalid original field lexeme');
  if(row.normalized!==undefined){
   shape(row.normalized,['date','amount'],[]);
   if(row.normalized.date!==undefined){const d=row.normalized.date;shape(d,['value','meaning','transformation']);if(!date(d.value)||!['receipt','purchase','posting'].includes(d.meaning)||!text(d.transformation,observationLimits.evidence))fail('Invalid normalized source date');}
   if(row.normalized.amount!==undefined){const a=row.normalized.amount;shape(a,['cents','currency','sign_convention','transformation']);if(!Number.isSafeInteger(a.cents)||typeof a.currency!=='string'||!/^[A-Z]{3}$/.test(a.currency)||!['charge_positive','debit_negative'].includes(a.sign_convention)||!text(a.transformation,observationLimits.evidence))fail('Invalid normalized source amount');}
  }
 }
 for(const candidate of input.candidates){shape(candidate,['source_line','target_transaction_id','relationship_kind','evidence']);if(!line(candidate.source_line)||!identity(candidate.target_transaction_id)||!['describes_transaction','funding_candidate'].includes(candidate.relationship_kind)||!text(candidate.evidence,observationLimits.evidence))fail('Invalid candidate relationship');}
 if(new TextEncoder().encode(JSON.stringify(input)).length>observationLimits.bytes)fail('Observation envelope exceeds byte limit');
 return stable(structuredClone(input));
}
export function planSourceObservations(state,input){
 const batch=validateSourceObservations(input),draft=structuredClone(state);
 const registry=draft.observation_sources||{},observations=draft.observations||{},candidates=draft.observation_candidates||{};
 const metadata=Object.fromEntries(['source_id','source_type','source_hash','extractor','supersedes_source_id'].filter(key=>Object.hasOwn(batch,key)).map(key=>[key,batch[key]]));
 const previous=registry[batch.source_id];
 if(previous&&observationDigestInput(previous)!==observationDigestInput(metadata))fail('Conflicting immutable observation source');
 if(batch.supersedes_source_id&&!Object.hasOwn(registry,batch.supersedes_source_id))fail('Supersession source must already exist');
 const result={new_sources:previous?0:1,new_observations:0,observation_replays:0,new_candidates:0,candidate_replays:0,new_transactions:0,financial_effect:'non-additive evidence only'};
 registry[batch.source_id]=metadata;
 for(const row of batch.observations){const key=JSON.stringify([batch.source_id,row.source_line]),old=observations[key];if(old){if(observationDigestInput(old)!==observationDigestInput(row))fail('Conflicting immutable observation line');result.observation_replays++;}else{observations[key]=row;result.new_observations++;}}
 for(const candidate of batch.candidates){
  if(!Object.hasOwn(observations,JSON.stringify([batch.source_id,candidate.source_line])))fail('Candidate observation must exist');
  const key=JSON.stringify([batch.source_id,candidate.source_line,candidate.target_transaction_id,candidate.relationship_kind]),old=candidates[key];
  if(old){if(observationDigestInput(old)!==observationDigestInput(candidate))fail('Conflicting immutable candidate relationship');result.candidate_replays++;}else{candidates[key]=candidate;result.new_candidates++;}
 }
 draft.observation_sources=registry;draft.observations=observations;draft.observation_candidates=candidates;
 return {draft,result,batch};
}
export function querySourceObservations(state,args={}){
 shape(args,['collection','source_id','source_type','original_record_id','month','months','offset','limit'],[]);
 if(args.collection!==undefined&&args.collection!=='observations'||args.source_id!==undefined&&!identity(args.source_id)||args.source_type!==undefined&&!['Era','Statement','Receipt','Snapshot'].includes(args.source_type)||args.original_record_id!==undefined&&!identity(args.original_record_id)||args.month!==undefined&&(typeof args.month!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(args.month))||args.offset!==undefined&&(!Number.isSafeInteger(args.offset)||args.offset<0)||args.limit!==undefined&&(!Number.isSafeInteger(args.limit)||args.limit<1||args.limit>observationLimits.query))fail('Invalid observation query');
 if(args.months!==undefined&&(!Array.isArray(args.months)||!args.months.length||args.months.length>24||args.month!==undefined||args.months.some(month=>typeof month!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))))fail('Invalid observation months');
 const rows=Object.entries(state.observations||{}).map(([key,row])=>{const [source_id]=JSON.parse(key);return {source_id,...row};}).filter(row=>
  (args.source_id===undefined||row.source_id===args.source_id)&&(args.source_type===undefined||state.observation_sources[row.source_id].source_type===args.source_type)&&(args.original_record_id===undefined||row.original_record_id===args.original_record_id)&&(args.month===undefined||row.normalized?.date?.value.slice(0,7)===args.month)&&(args.months===undefined||args.months.includes(row.normalized?.date?.value.slice(0,7)))
 ).sort((a,b)=>a.source_id<b.source_id?-1:a.source_id>b.source_id?1:a.source_line-b.source_line);
 const candidates=Object.entries(state.observation_candidates||{}).map(([key,row])=>({source_id:JSON.parse(key)[0],...row}));
 const matching=new Set(rows.map(row=>JSON.stringify([row.source_id,row.source_line]))),selectedCandidates=candidates.filter(row=>matching.has(JSON.stringify([row.source_id,row.source_line])));
 const source_type_counts={};for(const row of rows){const type=state.observation_sources[row.source_id].source_type;source_type_counts[type]=(source_type_counts[type]||0)+1;}
 return {summary:{source_type_counts,unresolved_attribution:rows.length,candidate_links:selectedCandidates.length,candidate_targets_present:selectedCandidates.filter(row=>Object.hasOwn(state.transactions,row.target_transaction_id)).length,candidate_targets_missing:selectedCandidates.filter(row=>!Object.hasOwn(state.transactions,row.target_transaction_id)).length,accepted_matches:0},collection:'observations',revision:state.revision,total:rows.length,items:rows.slice(args.offset||0,(args.offset||0)+(args.limit||100)).map(row=>({
  ...structuredClone(row),custody_events:Object.entries(state.imports||{}).filter(([,receipt])=>receipt.format==='source_observations'&&receipt.source_id===row.source_id&&receipt.source_lines.includes(row.source_line)).map(([key,receipt])=>({import_key:key,observed_at:receipt.observed_at,actor:structuredClone(receipt.actor),created_at:receipt.created_at,revision:receipt.revision})),source:structuredClone(state.observation_sources[row.source_id]),custody:'declared; bytes not independently verified',attribution:'unresolved',
  candidates:candidates.filter(candidate=>candidate.source_id===row.source_id&&candidate.source_line===row.source_line).map(candidate=>({...structuredClone(candidate),custody_events:Object.entries(state.imports||{}).filter(([,receipt])=>receipt.format==='source_observations'&&receipt.candidate_ids?.includes(JSON.stringify([candidate.source_id,candidate.source_line,candidate.target_transaction_id,candidate.relationship_kind]))).map(([key,receipt])=>({import_key:key,observed_at:receipt.observed_at,actor:structuredClone(receipt.actor),created_at:receipt.created_at,revision:receipt.revision})),status:'candidate',target_exists:Object.hasOwn(state.transactions,candidate.target_transaction_id),attribution:'unresolved'}))
 })),accepted_matches:0,amounts_are_non_additive:true,complete:false};
}
