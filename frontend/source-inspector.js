// Presentation only: original facts and counts come from the shared observation query.
export function createSourceInspector({host,status,more,getContext,request}){
 let sequence=0,offset=0,loaded=[],total=0,loadedContext=null;
 const element=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
 const signature=()=>JSON.stringify(getContext());
 const fields=(object)=>{const list=element('dl');list.className='source-fields';for(const [key,value] of Object.entries(object)){list.append(element('dt',key),element('dd',String(value)));}return list;};
 function renderRows(){host.replaceChildren();for(const row of loaded){
  const detail=element('details'),date=row.normalized?.date?.value||'Date not normalized',amount=row.normalized?.amount;
  const value=amount?new Intl.NumberFormat('en-US',{style:'currency',currency:amount.currency}).format(amount.cents/100):'Amount not normalized';
  detail.className='source-record';detail.append(element('summary',date+' · '+value+' · '+row.source.source_type+' · source row '+row.source_line));
  detail.append(element('p','Original record '+(row.original_record_id||'ID unavailable')+'. Attribution unresolved. Source amounts do not add to spending or income.'));
  const columns=element('div');columns.className='source-columns';const original=element('div');original.append(element('h3','Original document fields'),fields(row.original_fields));
  const provenance=element('div');provenance.append(element('h3','Extraction and candidate links'),fields({Source:row.source_id,'Physical source rows':row.source_line+'–'+row.source_end_line,'Source hash':row.source.source_hash,Extractor:row.source.extractor.name+' '+row.source.extractor.version,Custody:row.custody}));
  for(const [kind,normalized] of Object.entries(row.normalized||{}))provenance.append(element('h4','Declared '+kind+' transformation'),fields(normalized));
  for(const event of row.custody_events)provenance.append(element('p','Imported '+event.observed_at+' by '+(typeof event.actor==='string'?event.actor:event.actor?.id||'authorized actor')+' at revision '+event.revision));
  if(!row.candidates.length)provenance.append(element('p','No candidate bank link recorded.'));
  for(const candidate of row.candidates){const block=element('div');block.className='source-candidate';block.append(element('h4',candidate.target_exists?'Candidate target exists · match unconfirmed':'Candidate target missing'),fields({Target:candidate.target_transaction_id,Relationship:candidate.relationship_kind,Evidence:candidate.evidence}));for(const event of candidate.custody_events)block.append(element('p','Candidate imported '+event.observed_at+' by '+(typeof event.actor==='string'?event.actor:event.actor?.id||'authorized actor')));provenance.append(block);}
  columns.append(original,provenance);detail.append(columns);host.append(detail);
 }more.hidden=loaded.length>=total;more.disabled=false;}
 async function refresh(append=false){
  const id=++sequence,context=getContext(),key=signature();if(append&&loadedContext!==key)append=false;if(!append){offset=0;loaded=[];total=0;loadedContext=null;host.replaceChildren();status.textContent='Loading original source records…';}more.disabled=true;
  try{const response=await request({collection:'observations',...(context.months?{months:context.months}:{}),offset,limit:100});if(id!==sequence||signature()!==key)return;if(response.revision!==context.revision)throw Error('Source revision changed; reload source data');loaded=append?[...loaded,...response.items]:response.items;total=response.total;offset=loaded.length;loadedContext=key;
   status.textContent=response.total+' original source records · '+response.summary.candidate_links+' candidate links · '+response.summary.candidate_targets_missing+' missing targets · '+response.accepted_matches+' confirmed matches. Attribution remains unresolved across Home and Work. Date filtering uses source dates; undated records appear with All source dates.';renderRows();
  }catch(error){if(id!==sequence)return;loaded=[];total=offset=0;loadedContext=null;host.replaceChildren();more.hidden=true;more.disabled=false;status.textContent='Original source records unavailable: '+error.message;}
 }
 more.onclick=()=>refresh(true);
 return {refresh:()=>refresh(false),clear(){++sequence;loaded=[];offset=total=0;loadedContext=null;host.replaceChildren();more.hidden=true;status.textContent='Original source records unavailable until source data loads.';}};
}
