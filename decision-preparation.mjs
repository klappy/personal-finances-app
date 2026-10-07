import {dashboardRows} from './dashboard-domain.mjs';
export const decisionPreviewOutputSchema={type:'object',additionalProperties:false,required:['revision','prepared_decisions','suggestions','effective_record_states','dependent_suggestions_applied'],properties:{effective_record_states:{type:'array',items:{type:'object',required:['transaction_id','visible_in_snapshot_window','purpose','group','category','effective_scope','scope_reason'],additionalProperties:false,properties:{transaction_id:{type:'string'},visible_in_snapshot_window:{type:'boolean'},purpose:{type:['string','null']},group:{type:['string','null']},category:{type:['string','null']},effective_scope:{enum:['home','work',null]},scope_reason:{type:['string','null']}}}},revision:{type:'integer'},prepared_decisions:{type:'object'},dependent_suggestions_applied:{const:false},suggestions:{type:'array',items:{type:'object',additionalProperties:false,required:['transaction_id','field','current_value','proposed_value','reason'],properties:{transaction_id:{type:'string'},field:{enum:['purpose','category']},current_value:{type:['string','null']},proposed_value:{type:'string'},reason:{type:'string'}}}}}};
import {validateDecisions} from './decisions.mjs';
import {dashboardSnapshot} from './snapshot.mjs';
export const decisionEditFields=['purpose','group','category','travel_purpose','insurance_type','evidence','inflow_role'];
export const decisionChoiceOptions={travel_purpose:['Unclassified','Work','Personal / family'],insurance_type:['Unclassified','Car','Health','Life','Disability','Pet','Home / renters','Other'],inflow_role:['Unresolved','Wife contribution','Reimbursement','Earned income','Internal transfer','Other','']};
export const decisionPreviewInputSchema={type:'object',additionalProperties:false,required:['revision','decisions','edits'],properties:{revision:{type:'integer'},decisions:{type:'object',properties:{transactions:{type:'object'},budgets:{type:'object'},commitments:{type:'object'},notes:{type:'string'}},required:['transactions','budgets','commitments','notes'],additionalProperties:false},edits:{type:'array',maxItems:500,items:{type:'object',additionalProperties:false,required:['transaction_id','fields'],properties:{transaction_id:{type:'string'},fields:{type:'object',additionalProperties:false,properties:Object.fromEntries(decisionEditFields.map(field=>[field,{type:'string',maxLength:field==='evidence'?20000:149,...(decisionChoiceOptions[field]?{enum:decisionChoiceOptions[field]}:{})}]))}}}}}};
export function prepareDecisions(state,args){
 if(!args||Object.keys(args).some(key=>!['revision','decisions','edits'].includes(key))||args.revision!==state.revision)throw Error('Revision conflict or unsupported preview argument');
 if(!Array.isArray(args.edits)||args.edits.length>500)throw Error('Invalid decision edits');
 const prepared=validateDecisions(state,args.decisions),edited=new Map();
 for(const edit of args.edits){
  if(!edit||Object.keys(edit).some(key=>!['transaction_id','fields'].includes(key))||typeof edit.transaction_id!=='string'||!edit.transaction_id||['__proto__','constructor','prototype'].includes(edit.transaction_id)||!edit.fields||typeof edit.fields!=='object'||Array.isArray(edit.fields))throw Error('Invalid decision edit');
  const fields=edited.get(edit.transaction_id)||{};
  for(const [field,raw] of Object.entries(edit.fields)){
   if(!decisionEditFields.includes(field)||typeof raw!=='string'||raw.length>(field==='evidence'?20000:149))throw Error('Invalid editable field');
   if(decisionChoiceOptions[field]&&!decisionChoiceOptions[field].includes(raw))throw Error('Invalid choice option');
   const value=field==='inflow_role'&&raw==='Unresolved'?'':raw;
   if(Object.hasOwn(fields,field)&&fields[field]!==value)throw Error('Conflicting duplicate decision edit');fields[field]=value;
  }
  edited.set(edit.transaction_id,fields);
 }
 for(const [id,fields] of edited)prepared.transactions[id]={...(prepared.transactions[id]||{}),...fields};
 const decisions=validateDecisions(state,prepared),snapshot=dashboardSnapshot(state),facts=new Map();
 for(const record of snapshot.transactions){facts.set(record.id,record);for(const part of snapshot.overrides.transactions?.[record.id]?.splits||record.splits||[])facts.set(part.id,{...record,...part});}
 const effectiveRows=new Map(dashboardRows(snapshot,decisions,{scope:'combined',all:true,includeScopeAttribution:true}).map(row=>[row.id,row]));
 const effective_record_states=[...edited.keys()].map(id=>{const row=effectiveRows.get(id);return {transaction_id:id,visible_in_snapshot_window:!!row,purpose:row?.purpose??null,group:row?.group??null,category:row?.category??null,effective_scope:row?.scope_attribution.scope??null,scope_reason:row?.scope_attribution.reason??null};});
 const suggestions=[];
 for(const [id] of edited){const row={...facts.get(id),...decisions.transactions[id]};
  if(row.group==='Travel'&&row.travel_purpose==='Work'&&row.purpose!=='Business'&&(Object.hasOwn(decisions.transactions[id]||{},'purpose')||effectiveRows.get(id)?.purpose!=='Business'))suggestions.push({transaction_id:id,field:'purpose',current_value:row.purpose??null,proposed_value:'Business',reason:'Work travel conflicts with the explicitly selected purpose; review before changing it.'});
  if(row.group==='Insurance'&&row.insurance_type&&row.insurance_type!=='Unclassified'&&row.category!==row.insurance_type+' insurance')suggestions.push({transaction_id:id,field:'category',current_value:row.category??null,proposed_value:row.insurance_type+' insurance',reason:'Insurance type offers a more specific category; explicit category is preserved.'});
 }
 return {revision:state.revision,prepared_decisions:structuredClone(decisions),suggestions,effective_record_states,dependent_suggestions_applied:false};
}
