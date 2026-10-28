export function createDecisionPreviewGate({getContext,request}){
 let sequence=0;
 return {invalidate(){sequence++;},async read(){const current=++sequence,context=structuredClone(getContext()),signature=JSON.stringify(context);const result=await request({revision:context.revision,decisions:context.decisions,edits:[{transaction_id:context.transaction_id,fields:context.fields}]});if(current!==sequence||signature!==JSON.stringify(getContext()))return null;if(result.revision!==context.revision)throw Error('Preview revision changed; reload before saving');return {context:signature,result};},isCurrent(preview){return !!preview&&preview.context===JSON.stringify(getContext());}};
}
