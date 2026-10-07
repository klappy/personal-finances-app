const plain=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const reserved=key=>['__proto__','constructor','prototype'].includes(key);
const calendarDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'')&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
const utcTimestamp=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?Z$/.test(value)&&calendarDate(value.slice(0,10));
const text=(value,max=500)=>typeof value==='string'&&value.length>0&&value.length<=max;
export function validateRuntimeEvidence(input){
 if(!plain(input)||Object.keys(input).some(k=>!['source_id','source_type','source_hash','observed_at','payload'].includes(k))||!text(input.source_id,300)||input.source_type!=='Snapshot'||!/^[a-f0-9]{64}$/.test(input.source_hash||'')||!utcTimestamp(input.observed_at)||!plain(input.payload))throw Error('Invalid runtime evidence');
 const payload=input.payload;if(!Object.keys(payload).length||Object.keys(payload).some(k=>!['reference_notes','original_era_monthly_counts','account_snapshots'].includes(k)))throw Error('Unknown runtime evidence field');
 if(payload.reference_notes!==undefined){if(!plain(payload.reference_notes)||Object.keys(payload.reference_notes).length>100)throw Error('Invalid reference notes');for(const [key,value] of Object.entries(payload.reference_notes))if(reserved(key)||!text(key,100)||!text(value,20000))throw Error('Invalid reference note');}
 if(payload.original_era_monthly_counts!==undefined){if(!plain(payload.original_era_monthly_counts)||Object.keys(payload.original_era_monthly_counts).length>200)throw Error('Invalid feed inventory');for(const [account,months] of Object.entries(payload.original_era_monthly_counts)){if(reserved(account)||!text(account,300)||!plain(months)||Object.keys(months).length>60)throw Error('Invalid feed inventory');for(const [month,count] of Object.entries(months))if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)||!Number.isInteger(count)||count<0)throw Error('Invalid feed count');}}
 if(payload.account_snapshots!==undefined){if(!Array.isArray(payload.account_snapshots)||payload.account_snapshots.length>200)throw Error('Invalid account snapshots');const ids=new Set();for(const row of payload.account_snapshots){if(!plain(row)||Object.keys(row).some(k=>!['account','institution','balance','as_of','account_type','purpose','evidence_note'].includes(k))||!text(row.account,300)||ids.has(row.account)||!text(row.institution,300)||!Number.isFinite(row.balance)||!calendarDate(row.as_of)||!['credit_card','loan','bank'].includes(row.account_type)||!['Household','Personal','Business','Unresolved'].includes(row.purpose)||row.evidence_note!==undefined&&!text(row.evidence_note,2000))throw Error('Invalid account snapshot');ids.add(row.account);}}
 const result=structuredClone(input);result.observed_at=new Date(input.observed_at).toISOString();return result;
}

export function planRuntimeEvidence(state,input){
 const evidence=validateRuntimeEvidence(input);
 if(reserved(evidence.source_id))throw Error('Reserved runtime source identity');
 if(!state.dashboard_context)throw Error('Dashboard context required before runtime evidence import');
 const draft=structuredClone(state),sources=draft.runtime_evidence||{},previous=Object.hasOwn(sources,evidence.source_id)?sources[evidence.source_id]:null;
 if(previous&&JSON.stringify(previous)!==JSON.stringify(evidence))throw Error('Conflicting immutable runtime source');
 const context=draft.dashboard_context;let added=0;
 for(const [field,value] of Object.entries(evidence.payload)){
  if(field==='account_snapshots'){
   const current=context[field]||[],byAccount=new Map(current.map(row=>[JSON.stringify([row.account,row.as_of]),row]));
   for(const row of value){const key=JSON.stringify([row.account,row.as_of]),old=byAccount.get(key);if(old&&JSON.stringify(old)!==JSON.stringify(row))throw Error('Runtime account evidence conflicts; explicit replacement required');if(!old){byAccount.set(key,row);added++;}}
   context[field]=[...byAccount.values()];
  }else{
   const current=context[field]||{};
   for(const [key,item] of Object.entries(value)){
    if(field==='original_era_monthly_counts'){
     const counts=current[key]||{};for(const [month,count] of Object.entries(item)){if(Object.hasOwn(counts,month)&&counts[month]!==count)throw Error('Runtime inventory conflicts; explicit replacement required');if(!Object.hasOwn(counts,month)){counts[month]=count;added++;}}current[key]=counts;
    }else{if(Object.hasOwn(current,key)&&current[key]!==item)throw Error('Runtime reference conflicts; explicit replacement required');if(!Object.hasOwn(current,key)){current[key]=item;added++;}}
   }context[field]=current;
  }
 }
 sources[evidence.source_id]=evidence;draft.runtime_evidence=sources;
 return {draft,result:{new_runtime_sources:previous?0:1,new_context_entries:added,migration_source:'Snapshot derivative; original source completeness unverified'}};
}
