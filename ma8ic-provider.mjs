import fs from 'node:fs/promises';
export function ma8icProvider({endpoint,clientId,clientSecret,contractBody,fetcher=fetch}){
 const url=new URL(endpoint);if(url.protocol!=='https:')throw Error('Jev endpoint must use HTTPS');
 return async input=>{
  const state=JSON.stringify(input.state),questions=input.questions;
  const r=await fetcher(url,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream','CF-Access-Client-Id':clientId,'CF-Access-Client-Secret':clientSecret},redirect:'error',body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'ask',arguments:{state,questions,contract:{...input.contract,body:contractBody}}}})});
  if(!r.ok)throw Error('Ma8ic Access or service failure: HTTP '+r.status);
  const msg=await r.json();if(msg.error||msg.result?.isError)throw Error('Ma8ic rejected the classification request');let out=msg.result?.structuredContent;if(!out){const text=msg.result?.content?.find(x=>x.type==='text')?.text;out=text?JSON.parse(text):null;}
  if(!out?.receipt||out.contract!==input.contract.name+'@'+input.contract.version||!out.contract_sha256)throw Error('Ma8ic contract receipt missing');
  const assessments=Object.keys(input.questions).map((key,option_index)=>({option_index,score:out.answers?.[key]?.probability}));
  return{assessments,model:'typesafe/jev via ma8ic-8all',model_version:out.model_version||null,receipt:out.receipt,contract_sha256:out.contract_sha256,latency_ms:out.latency_ms};
 };
}
export async function providerFromEnvironment(){if(!process.env.MA8IC_CREDENTIALS_FILE)return null;const path=process.env.MA8IC_CREDENTIALS_FILE,stat=await fs.stat(path);if(stat.mode&0o077)throw Error('Ma8ic credential file must be private (0600)');const config=JSON.parse(await fs.readFile(path,'utf8'));if(!config.clientId||!config.clientSecret)throw Error('Ma8ic Access credentials missing');return ma8icProvider({...config,endpoint:config.endpoint||'https://ma8ic-8all.klappy.workers.dev/mcp',contractBody:await fs.readFile(new URL('./contracts/classification-v1.md',import.meta.url),'utf8')});}
