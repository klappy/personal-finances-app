export const classificationGroups=['Housing','Debt','Food','Shopping and home','Travel','AI','Insurance','Giving','Taxes','Digital services','Lifestyle','Transport','Health','Needs review','Business','Infrastructure','Other work'];
export function sum(rr,key){return rr.reduce((s,r)=>s+(Number(r[key])||0),0)}
export function purchasePlace(r){const s=r.merchant.toLowerCase();const rules=[[/toho\s*water|city\s*of\s*st[. ]*cloud/,'Water / sewer / trash'],[/wal.?mart/,'Walmart'],[/publix/,'Publix'],[/burger king/,'Burger King'],[/pei.?wei/,'Pei Wei'],[/starbucks/,'Starbucks'],[/atlas.?coffee/,'Atlas Coffee Club'],[/cielito/,'Cielito Coffee'],[/home.?depot/,'Home Depot'],[/coconuts/,'Coconuts'],[/doordash/,'DoorDash']];return rules.find(([p])=>p.test(s))?.[1]||r.merchant}
export function billName(r){if(r.subscription_name)return r.subscription_name;if(r.parent_transaction_id)return r.merchant;const s=(r.merchant+' '+r.description).toLowerCase();const rules=[[/insperity/,'Insperity'],[/mission orlando/,'Mission Orlando'],[/compassion/,'Compassion'],[/partnershipfca/,'FCA'],[/northwestern/,'Northwestern Mutual'],[/health plans/,'Health Plans'],[/progressive/,'Progressive'],[/lemonade/,'Lemonade'],[/sofi/,'SoFi loan'],[/greystar/,'Greystar settlement'],[/kua|kissimmee util/,'KUA electricity'],[/toho\s*water|city\s*of\s*st[. ]*cloud/,'Water / sewer / trash'],[/t.mobile/,'T-Mobile'],[/spectrum/,'Spectrum'],[/cursor/,'Cursor'],[/openai/,'OpenAI'],[/anthropic/,'Anthropic'],[/lovable/,'Lovable'],[/cloudflare/,'Cloudflare'],[/elevenlabs/,'ElevenLabs'],[/github/,'GitHub'],[/google|youtube/,'Google / YouTube — products to split'],[/apple.com|apple services/,'Apple services — products to split'],[/netflix/,'Netflix'],[/hulu/,'Hulu'],[/audible/,'Audible'],[/prime video/,'Prime Video'],[/ring/,'Ring'],[/nest/,'Nest'],[/experian/,'Experian'],[/remarkable/,'reMarkable'],[/cookidoo/,'Cookidoo'],[/dashpass/,'DoorDash DashPass'],[/rocket money/,'Rocket Money'],[/manychat/,'ManyChat'],[/massive/,'Massive'],[/fyxer/,'Fyxer'],[/replicate/,'Replicate'],[/twilio/,'Twilio']];if(r.group==='Insurance'&&/northwestern/i.test(s))return 'Northwestern Mutual · '+r.category;if(r.group==='Insurance'&&/lemonade/i.test(s))return 'Lemonade · pet insurance';if(r.category==='Tithe')return 'Mission Orlando';if(r.category==='Kingdom Builder offering')return 'Mission Orlando · Kingdom Builder offering';if(r.category==='Mortgage')return 'Mortgage';if(/interest/i.test(r.category)||r.source_type==='Interest')return 'Card interest · '+r.account;return rules.find(([p])=>p.test(s))?.[1]||r.merchant}
export function scopeRows(rows, scope='combined', commitments={}) {
 if(!['home','work','combined'].includes(scope))throw Error('Invalid scope');
 return rows.filter(r=>{const assigned=commitments[billName(r)]?.budgetScope;const work=assigned?assigned==='work':r.purpose==='Business'||r.work_receipt>0||r.inflow_role==='Mixed business income / reimbursement';return scope==='combined'||(scope==='work'?work:!work)});
}
export const additiveMeasures=['spend','payroll','work_receipt','bank_card_repayment','refund','review_credit','business_payroll_estimate','reimbursement_estimate'];
export function expandAllocations(parent, decisions={}) {
 if(!parent.splits)return [parent];
 if(!Array.isArray(parent.splits)||!parent.splits.length)throw Error('Invalid split allocations');
 const ids=new Set();
 const children=parent.splits.map(part=>{if(typeof part.id!=='string'||part.id===parent.id||ids.has(part.id))throw Error('Split requires unique child identities');ids.add(part.id);const child={...parent,...part,splits:undefined,...(decisions[part.id]||{}),parent_transaction_id:parent.id};
  for(const field of additiveMeasures){const value=(decisions[part.id]?.[field]??part[field]??0);if(!Number.isFinite(value)||value<0)throw Error('Invalid split measure: '+field);child[field]=value;}
  const decision=decisions[part.id]||{};child.reimbursement_amount=Object.hasOwn(decision,'reimbursement_amount')?decision.reimbursement_amount:Object.hasOwn(part,'reimbursement_amount')?part.reimbursement_amount:null;
  if(child.reimbursement_amount!==null&&(!Number.isFinite(child.reimbursement_amount)||child.reimbursement_amount<0))throw Error('Invalid split reimbursement amount');
  return child;
 });
 for(const field of additiveMeasures){const value=parent[field]??0;if(!Number.isFinite(value)||value<0)throw Error('Invalid parent measure: '+field);const total=children.reduce((n,r)=>n+Math.round(r[field]*100),0);if(total!==Math.round(value*100))throw Error('Split conservation conflict: '+field);}
 if(parent.reimbursement_amount!=null){if(!Number.isFinite(parent.reimbursement_amount)||parent.reimbursement_amount<0)throw Error('Invalid parent reimbursement amount');const allocated=children.reduce((n,row)=>n+Math.round((row.reimbursement_amount??0)*100),0);if(allocated!==Math.round(parent.reimbursement_amount*100))throw Error('Split reimbursement conservation conflict');}
 return children;
}
export function dashboardRows(data, overrides={}, options={}) {
 const scope=options.scope||'combined', period=options.period||'all', months=data.months||[];
 const original=new Map(data.transactions.map(row=>[row.id,row]));
 const hasSavedPurpose=row=>Object.hasOwn(overrides.transactions?.[row.id]||{},'purpose')||row.parent_transaction_id&&(Object.hasOwn(overrides.transactions?.[row.parent_transaction_id]||{},'purpose')||Object.hasOwn((overrides.transactions?.[row.parent_transaction_id]?.splits||original.get(row.parent_transaction_id)?.splits||[]).find(part=>part.id===row.id)||{},'purpose'));
 let rows=data.transactions.flatMap(r=>{const parent={...r,...(overrides.transactions?.[r.id]||{})};return expandAllocations(parent,overrides.transactions||{})});
 rows=rows.map(r=>!r.classification_reviewed&&!hasSavedPurpose(r)&&r.group==='Travel'&&r.travel_purpose==='Work'?{...r,purpose:'Business'}:r);
 rows=scopeRows(rows,scope,overrides.commitments||{});
 return rows
 .map(r=>r.purpose==='Business'?{...r,original_group:r.group,group:'Business',category:r.group==='AI'?'AI · '+r.category:r.group==='Travel'?'Work travel · '+r.category:r.category}:r)
 .map(r=>{if(scope==='work'&&r.group==='Business'){const text=(r.merchant+' '+r.description+' '+r.category).toLowerCase();return {...r,group:r.original_group==='AI'||/anthropic|cursor|open\s*ai|claude|fyxer|elevenlabs|lovable|grok|replicate/.test(text)?'AI':r.original_group==='Travel'?'Travel':/cloudflare|github|twilio|hosting|domain/.test(text)?'Infrastructure':'Other work'}}return r})
 .map(r=>{if(r.reimbursement_amount!=null&&(!Number.isFinite(r.reimbursement_amount)||r.reimbursement_amount<0))throw Error('Invalid reimbursement amount');return r;})
 .map(r=>options.hideReimbursed&&r.reimbursement_status==='Paid'?{...r,spend:Math.max(0,r.spend-(r.reimbursement_amount||0))}:r)
 .filter(r=>options.all||period==='all'?months.includes(r.month):r.month===period);
}
export function planningItems(rows, months) {
 const bills={}; rows.filter(r=>r.scope==='Household'&&r.spend>0&&(r.purpose==='Business'||['Housing','Debt','Insurance','Giving','Digital services','AI','Business'].includes(r.group)||r.category==='Groceries'||(r.group==='Food'&&/eating out|restaurant|meal delivery/i.test(r.category+' '+r.detail)))).forEach(r=>{const name=r.group==='Food'&&/eating out|restaurant|meal delivery/i.test(r.category+' '+r.detail)?'Eating out':r.category==='Groceries'?'Groceries':r.category==='Lawn services'?'Lawn services':billName(r);(bills[name]??=[]).push(r)});
 return Object.entries(bills).map(([name,rr])=>({name,rr,avg:months.length?sum(rr,'spend')/months.length:null,work:rr.some(r=>r.purpose==='Business'),group:rr[0].group,observedMonths:new Set(rr.map(r=>r.month)).size,latest:Math.abs([...rr].sort((a,b)=>b.date.localeCompare(a.date))[0].spend)}));
}
