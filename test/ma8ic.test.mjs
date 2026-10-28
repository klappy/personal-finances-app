import {prepareClassificationRequest,interpretClassificationResult} from '../classification-contract.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import {ma8icProvider} from '../ma8ic-provider.mjs';import {empty,operate} from '../core.mjs';
test('Ma8ic adapter sends typed questions and hashed contract, without account identifiers',async()=>{let body;const choice={group:'Food',category:'Groceries',purpose:'Household'},provider=ma8icProvider({endpoint:'https://fixture.example/mcp',clientId:'fixture',clientSecret:'fixture',contractBody:'fixture-contract',fetcher:async(_,options)=>{body=JSON.parse(options.body);return new Response(JSON.stringify({result:{structuredContent:{receipt:'fixture-receipt',contract:'finance-classification@1',contract_sha256:'fixture-hash',model_version:'jev-fixture',answers:{option_0:{probability:0.8},option_1:{probability:0.2}},latency_ms:12}}}),{status:200});}});const out=interpretClassificationResult(await provider(prepareClassificationRequest({merchant:'Fixture Market',options:[choice,null],examples:[]})),[choice,null]);assert.deepEqual(out.classification,choice);assert.equal(out.receipt,'fixture-receipt');assert.equal(out.model_version,'jev-fixture');assert.equal(body.params.name,'ask');assert.equal(body.params.arguments.questions.option_0.type,'noul');assert.equal(body.params.arguments.contract.body,'fixture-contract');assert.ok(!body.params.arguments.state.includes('account'));});
test('provider failure leaves accepted classification unchanged and stores fallback proposal',async()=>{const s=empty(),c={group:'Food',category:'Groceries',purpose:'Household'};s.transactions.one={id:'one',merchant:'Fixture Market',classification:c};s.reviews.push({id:'review',status:'accepted',merchant:'Fixture Market',classification:c});const p=await operate(s,'classification_propose',{revision:0,transaction_id:'one'},'human',async()=>{throw Error('unreachable')});assert.equal(p.origin,'history fallback');assert.match(p.provider_error,/fallback/);assert.deepEqual(s.transactions.one.classification,c);assert.equal(p.needs_review,true);});
test('Worker AI binding adapter preserves actual model version and validates response',async()=>{const {cloudflareJevProvider}=await import('../cloudflare-jev-provider.mjs');let model;const p=cloudflareJevProvider({run:async(m)=>{model=m;return{state:'Completed',result:{model:'jev-1.13.0',answers:{option_0:{noul:0.98},option_1:{noul:0.02}}}};}},'fixture contract');const out=await p(prepareClassificationRequest({merchant:'Fixture Market',options:[{group:'Food',category:'Groceries',purpose:'Household'},null],examples:[]}));assert.equal(model,'typesafe/jev');assert.equal(out.model_version,'jev-1.13.0');assert.equal(out.contract_sha256.length,64);});
test('core owns provider questions and selects abstention without changing accepted facts',async()=>{
 const {cloudflareJevProvider}=await import('../cloudflare-jev-provider.mjs');let sent;
 const s=empty(),classification={group:'Food',category:'Groceries',purpose:'Household'};
 s.transactions.one={id:'one',merchant:'Unknown Fixture',classification};s.reviews.push({id:'prior',status:'accepted',merchant:'Other Fixture',classification});
 const provider=cloudflareJevProvider({run:async(_,payload)=>{sent=payload;return {model:'jev-fixture',answers:{option_0:{noul:0.2},option_1:{noul:0.8}}}}},'fixture contract');
 const proposal=await operate(s,'classification_propose',{revision:0,transaction_id:'one'},'human',provider);
 assert.equal(proposal.origin,'Jev');assert.equal(proposal.proposed,null);assert.equal(proposal.needs_review,true);assert.equal(proposal.inference.model_version,'jev-fixture');assert.deepEqual(s.transactions.one.classification,classification);assert.equal(s.reviews.length,1);
 assert.match(JSON.parse(sent.state).task,/Do not approve/);assert.equal(sent.questions.option_1.type,'noul');assert.ok(!JSON.parse(sent.state).account);
});
test('invalid or duplicate provider assessment identities preserve historical fallback',async()=>{
 const classification={group:'Food',category:'Groceries',purpose:'Household'};
 for(const assessments of [[{option_index:0,score:1},{option_index:0,score:0}],[{option_index:0,score:2},{option_index:1,score:0}],[{option_index:0,score:1}]]){
  const s=empty();s.transactions.one={id:'one',merchant:'Fixture',classification};s.reviews.push({id:'prior',status:'accepted',merchant:'Fixture',classification});
  const p=await operate(s,'classification_propose',{revision:0,transaction_id:'one'},'human',async()=>({model:'fixture',model_version:'jev-fixture',assessments}));
  assert.equal(p.origin,'history fallback');assert.equal(p.needs_review,true);assert.deepEqual(s.transactions.one.classification,classification);assert.equal(s.reviews.length,1);
 }
});
test('missing actual provider version retains accepted history instead of a Jev-labelled proposal',async()=>{
 const classification={group:'Food',category:'Groceries',purpose:'Household'};
 for(const model_version of [undefined,null,'',{},42]){
  const s=empty();s.transactions.one={id:'one',merchant:'Fixture',classification};s.reviews.push({id:'prior',status:'accepted',merchant:'Fixture',classification});
  const p=await operate(s,'classification_propose',{revision:0,transaction_id:'one'},'human',async()=>({model:'typesafe/jev',model_version,assessments:[{option_index:0,score:1},{option_index:1,score:0}]}));
  assert.equal(p.origin,'history fallback');assert.match(p.provider_error,/invalid result/);assert.deepEqual(p.proposed,classification);assert.deepEqual(s.transactions.one.classification,classification);assert.equal(p.needs_review,true);assert.equal(s.reviews.length,1);
 }
});
