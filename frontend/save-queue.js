// Serialize transport writes; queued documents are captured at the edit boundary.
export function createSaveQueue(write){
 let tail=Promise.resolve(),generation=0,pending=0,activity=0;
 const save=document=>{
  const captured=structuredClone(document),requestedGeneration=generation;pending++;activity++;
  const task=tail.then(async()=>{
   if(requestedGeneration!==generation)return {ok:false,reason:'Earlier save failed; queued draft was not sent'};
   try{const result=await write(captured);if(!result.ok)generation++;return result;}catch(error){generation++;return {ok:false,reason:error.message};}
  }).finally(()=>{pending--;});tail=task.then(()=>{});return task;
 };
 Object.defineProperties(save,{pending:{get:()=>pending},activity:{get:()=>activity}});return save;
}
export async function loadWithSaveGuard(queue,{draft,read,apply}){
 if(queue.pending)throw Error('Wait for pending saves before reloading. Your draft remains available to export.');
 const activity=queue.activity,captured=JSON.stringify(draft()),snapshot=await read();
 if(queue.activity!==activity||JSON.stringify(draft())!==captured)throw Error('Edits changed during reload. Source reload was discarded; your draft remains available to export.');
 apply(snapshot);
}
