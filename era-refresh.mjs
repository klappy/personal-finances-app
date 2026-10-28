import {createHash} from 'node:crypto';

// L5 adapter for the existing Era posted-transaction connector. No credentials,
// network access, scheduling or bank mutations belong in this module.
export const eraRefreshLimits=Object.freeze({accounts:20,pages:50,records:500,window_days:35,bytes:1000000});
const fail=message=>{throw Error(message);};
const plain=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const reserved=key=>['__proto__','prototype','constructor'].includes(key);
const text=(value,max=299)=>typeof value==='string'&&value.length>0&&value.length<=max&&!reserved(value);
const date=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
const exact=(value,keys)=>plain(value)&&Object.keys(value).every(key=>keys.includes(key));
const sha=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
function stable(value,depth=0){
 if(depth>12)fail('Era source nesting limit');
 if(Array.isArray(value))return value.map(item=>stable(item,depth+1));
 if(plain(value)){const result={};for(const key of Object.keys(value).sort()){if(reserved(key))fail('Reserved Era source key');result[key]=stable(value[key],depth+1);}return result;}
 if(value!==null&&!['string','number','boolean'].includes(typeof value)||typeof value==='number'&&!Number.isFinite(value))fail('Invalid Era source value');
 return value;
}
export function prepareEraRefresh(state,input){
 if(!exact(input,['observed_at','from_date','to_date','policy','pages'])||!date(input.from_date)||!date(input.to_date)||input.from_date>input.to_date||typeof input.observed_at!=='string'||!/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?Z$/.test(input.observed_at)||!Number.isFinite(Date.parse(input.observed_at))||!date(input.observed_at.slice(0,10))||input.to_date>input.observed_at.slice(0,10))fail('Invalid Era refresh window or timestamp');
 if((Date.parse(input.to_date)-Date.parse(input.from_date))/86400000+1>eraRefreshLimits.window_days)fail('Era refresh window limit');
 if(!Array.isArray(input.policy)||!input.policy.length||input.policy.length>eraRefreshLimits.accounts||!Array.isArray(input.pages)||!input.pages.length||input.pages.length>eraRefreshLimits.pages)fail('Era refresh account/page limit');
 let evidence;try{evidence=stable(input);}catch(error){throw error;}
 if(Buffer.byteLength(JSON.stringify(evidence),'utf8')>eraRefreshLimits.bytes)fail('Era refresh byte limit');
 const policies=new Map(),kinds=['purchase','card_payment','internal_transfer','unclassified_credit','refund'];
 for(const policy of evidence.policy){
  if(!exact(policy,['account_group_key','account','account_type','new_records_from','kinds'])||!text(policy.account_group_key,100)||policies.has(policy.account_group_key)||!text(policy.account)||!['Checking','Savings','Credit Card'].includes(policy.account_type)||!date(policy.new_records_from)||!plain(policy.kinds)||Object.keys(policy.kinds).length>200||Object.entries(policy.kinds).some(([key,value])=>!text(key,150)||!kinds.includes(value)))fail('Invalid explicit Era account policy');
  policies.set(policy.account_group_key,policy);
 }
 const byAccount=new Map([...policies.keys()].map(key=>[key,[]]));
 for(const page of evidence.pages){
  if(!exact(page,['account_group_key','request','response'])||!policies.has(page.account_group_key)||!exact(page.request,['page','page_size','from_date','to_date'])||page.request.from_date!==input.from_date||page.request.to_date!==input.to_date||!Number.isSafeInteger(page.request.page)||page.request.page<1||!Number.isSafeInteger(page.request.page_size)||page.request.page_size<1||page.request.page_size>100||!plain(page.response)||page.response.history_window_applied!==false||Object.hasOwn(page.response,'warnings')&&(!Array.isArray(page.response.warnings)||page.response.warnings.length)||!Array.isArray(page.response.transactions)||!plain(page.response.pagination))fail('Incomplete or restricted Era page');
  byAccount.get(page.account_group_key).push(page);
 }
 const seen=new Set(),rows=[];
 for(const [key,policy] of policies){
  const pages=byAccount.get(key).sort((a,b)=>a.request.page-b.request.page);
  if(!pages.length)fail('Missing Era account pages');
  const first=pages[0].response.pagination,total=first.total_items,size=pages[0].request.page_size;
  if(!Number.isSafeInteger(total)||total<0||total>eraRefreshLimits.records)fail('Era record limit');
  const expectedPages=Math.max(1,Math.ceil(total/size));
  if(pages.length!==expectedPages)fail('Incomplete Era pagination');
  let observed=0;
  for(let index=0;index<pages.length;index++){
   const page=pages[index],p=page.response.pagination,expectedCount=Math.min(size,Math.max(0,total-index*size));
   if(page.request.page!==index+1||page.request.page_size!==size||p.current_page!==index+1||p.page_size!==size||p.total_items!==total||p.total_pages!==(total===0?0:expectedPages)&&!(total===0&&p.total_pages===1)||p.has_more!==(index+1<expectedPages)||page.response.transactions.length!==expectedCount)fail('Era pagination drift');
   for(const original of page.response.transactions){
    if(!plain(original)||!text(original.transaction_id)||seen.has(original.transaction_id)||original.account_group_key!==key||original.is_pending!==false||original.currency!=='USD'||!date(original.transaction_date)||original.transaction_date<input.from_date||original.transaction_date>input.to_date||typeof original.amount!=='number'||!Number.isSafeInteger(Math.round(original.amount*100))||Math.abs(original.amount*100-Math.round(original.amount*100))>0.000001||typeof original.is_cash_outflow!=='boolean'||original.amount===0||original.is_cash_outflow!==(original.amount<0)||!text(original.description,20000)||!text(original.category,150))fail('Invalid or repeated posted Era record');
    seen.add(original.transaction_id);observed++;if(seen.size>eraRefreshLimits.records)fail('Era record limit');
    const current=Object.hasOwn(state.transactions,original.transaction_id)?state.transactions[original.transaction_id]:null;
    if(current&&(current.account!==policy.account||current.amount!==original.amount||current.date!==original.transaction_date||current.attributes?.account_key&&current.attributes.account_key!==key))fail('Era canonical identity conflict');
    if(!current&&original.transaction_date<policy.new_records_from)fail('Unmatched historical Era record requires reconciliation');
    const kind=Object.hasOwn(policy.kinds,original.category)?policy.kinds[original.category]:null;
    if(!current&&!kind)fail('Unmapped Era economic kind requires review');
    if(kind==='purchase'&&original.amount>=0||['refund','unclassified_credit'].includes(kind)&&original.amount<=0||kind==='card_payment'&&(['Checking','Savings'].includes(policy.account_type)?original.amount>=0:original.amount<=0))fail('Era economic kind/sign conflict');
    const magnitude=Math.abs(original.amount),merchant=text(original.merchant_name)?original.merchant_name:original.description.slice(0,299);
    const attributes={account_key:key,account_type:policy.account_type,scope:'Household',description:original.description,source:'Era posted feed; reconciliation unverified',source_row:original.transaction_id,era_original:original,era_mapper:'era-refresh@1',kind:kind||'existing fact; evidence only',review_credit:kind==='unclassified_credit'?magnitude:0,refund:kind==='refund'?magnitude:0,bank_card_repayment:kind==='card_payment'&&policy.account_type!=='Credit Card'?magnitude:0};
    rows.push({source_id:'era-refresh:'+key+':'+sha(policy),source_line:original.transaction_id,source_type:'Era',transaction_id:original.transaction_id,account:policy.account,merchant,date:original.transaction_date,amount:original.amount,spend:kind==='purchase'?magnitude:0,classification:{group:'Needs review',category:'Needs category review',purpose:'Unresolved'},attributes});
   }
  }
  if(observed!==total)fail('Era pagination count mismatch');
 }
 rows.sort((a,b)=>a.transaction_id.localeCompare(b.transaction_id));
 evidence.policy.sort((a,b)=>a.account_group_key.localeCompare(b.account_group_key));
 evidence.pages.sort((a,b)=>a.account_group_key.localeCompare(b.account_group_key)||a.request.page-b.request.page);
 return {rows,evidence,metadata:{contract:'era-refresh@1',last_success_at:evidence.observed_at,from_date:evidence.from_date,to_date:evidence.to_date,account_count:policies.size,record_count:rows.length,complete:false,statement_reconciled:false,status:'Posted feed retrieved; account/month completeness and new classifications remain unverified'}};
}

// Host orchestration injects the already-authorized connector and capability
// caller. All reads finish before preview/commit; no credential is accepted.
export async function collectEraRefresh({readPage,policy,from_date,to_date,observed_at}){
 if(!Array.isArray(policy)||!policy.length||policy.length>eraRefreshLimits.accounts)fail('Era refresh account limit');
 // Validate caller scope before making the first connector read. Empty pages
 // are valid input for this validation-only pass, never a success claim.
 const emptyPages=policy.map(account=>({account_group_key:account?.account_group_key,request:{page:1,page_size:100,from_date,to_date},response:{history_window_applied:false,transactions:[],pagination:{current_page:1,page_size:100,total_items:0,total_pages:0,has_more:false}}}));
 prepareEraRefresh({transactions:{}},{policy,from_date,to_date,observed_at,pages:emptyPages});
 const pages=[];let count=0;
 for(const account of policy){
  let page=1,hasMore=true;
  while(hasMore){
   if(pages.length>=eraRefreshLimits.pages)fail('Era refresh page limit');
   const request={page,page_size:100,from_date,to_date};
   const response=await readPage({account_group_key:account.account_group_key,...request});
   if(!plain(response)||!Array.isArray(response.transactions)||!plain(response.pagination))fail('Invalid Era connector response');
   pages.push({account_group_key:account.account_group_key,request,response});count+=response.transactions.length;
   if(count>eraRefreshLimits.records)fail('Era refresh record limit');
   hasMore=response.pagination.has_more;if(typeof hasMore!=='boolean')fail('Era pagination terminal flag required');page++;
  }
 }
 return {observed_at,from_date,to_date,policy:structuredClone(policy),pages};
}
export async function commitEraRefresh({call,evidence,idempotency_key}){
 const preview=await call('project',{operation:'import_preview',args:{format:'era_refresh',evidence}});
 const receipt=await call('execute',{operation:'import_commit',args:{format:'era_refresh',evidence,idempotency_key,revision:preview.revision}});
 return {preview,receipt};
}
