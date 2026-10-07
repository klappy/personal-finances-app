const element=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
export function recordSourceNode(evidence){
 const host=element('div');host.className='record-source-evidence';if(!evidence){host.append(element('p','Source evidence unavailable'));return host;}
 host.append(element('div',evidence.display_label));const detail=element('details');detail.append(element('summary',evidence.reference_count+' source locators'));
 detail.append(element('p',evidence.reference_scope==='canonical_parent'?'References belong to the parent transaction; independent allocation evidence is not established.':'References describe this canonical record. Locator count does not establish independent corroboration.'));
 for(const ref of evidence.references)detail.append(element('p',ref.source_id+' · '+ref.source_line+' · '+ref.source_types.join(', ')+' · '+ref.status));
 if(evidence.reported_origin!==null)detail.append(element('p','Reported origin (unverified): '+evidence.reported_origin));
 detail.append(element('p',evidence.reconciliation_status));host.append(detail);return host;
}
export function createRecordSourceReader({getRevision,request}){
 let sequence=0,activeHost=null;
 return {invalidate(){++sequence;if(activeHost)activeHost.replaceChildren(element('p','Source evidence unavailable until the current revision is read'));activeHost=null;},async show(host,row){
  const id=++sequence,revision=getRevision();activeHost=host;host.replaceChildren(element('p','Loading source evidence…'));
  try{const result=await request({collection:'records',record_ids:[row.id],scope:'combined',period:row.date.slice(0,7),hide_reimbursed:false,limit:1});
   if(id!==sequence)return;if(result.revision!==revision||getRevision()!==revision)throw Error('Source revision changed; reload before continuing');
   const record=result.items.find(item=>item.id===row.id);if(!record?.source_evidence)throw Error('Record source references unavailable');host.replaceChildren(recordSourceNode(record.source_evidence));
  }catch(error){if(id!==sequence)return;host.replaceChildren(element('p','Source evidence unavailable: '+error.message));}
 }};
}
