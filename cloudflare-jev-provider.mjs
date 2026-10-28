// Dependency-free Worker adapter. Pass env.AI; no separate service credential.
export function cloudflareJevProvider(ai,contractBody){
 if(!ai||typeof ai.run!=='function')throw Error('Cloudflare AI binding required');
 return async input=>{
  const questions=input.questions,state=JSON.stringify({...input.state,contract_body:contractBody});
  const start=Date.now(),raw=await ai.run('typesafe/jev',{state,questions});
  const result=raw?.result?.result?.answers?raw.result.result:raw?.result?.answers?raw.result:raw;
  if(!result?.answers||!result.model)throw Error('Jev answers and actual model version required');
  const assessments=Object.keys(input.questions).map((key,option_index)=>({option_index,score:result.answers[key]?.noul}));
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(contractBody));
  return {assessments,model:'typesafe/jev',model_version:result.model,contract_sha256:[...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join(''),receipt:crypto.randomUUID(),latency_ms:Date.now()-start,usage:result.usage||null};
 };
}
