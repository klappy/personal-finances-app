import {prepareCommitmentMoves} from '../commitment-preparation.mjs';
import {commitmentEditorDecisionLabels} from '../commitment-contract.mjs';
import {coreMoneyCard} from '../frontend/context-evidence.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {commitmentDecision} from '../commitment-projection.mjs';

// Run the actual controller's planning handlers against a minimal DOM and pending saves.
test('baseline edits after a pending move preserve billing siblings and use the latest scope',async()=>{
 const source=readFileSync(new URL('../frontend/controller.js',import.meta.url),'utf8');
 const planning=source.slice(source.indexOf('function renderPlanning(){'),source.indexOf('function renderTransactionsForBills('));
 const controls=[],nodes=new Map();
 const element=(tag,text)=>({tag,text,style:{},children:[],append(...children){this.children.push(...children)},replaceChildren(...children){this.children=children},setAttribute(key,value){this[key]=value;controls.push(this)}});
 const $=id=>{if(!nodes.has(id))nodes.set(id,element('div'));return nodes.get(id)};
 $('baseline-mode').value='home';$('subscription-sort').value='amount';
 const overrides={commitments:{Example:{decision:'Keep',billingFrequency:'Monthly',billingCharge:20,workEssential:false,workBaselineAmount:600.01}}};
 const item={name:'Example',assigned_scope:'home',essential:false,baseline_monthly_amount:20,recorded_average_per_selected_month:20,observed_month_count:3,evidence_month_count:3,subscription_candidate:false};
 const writes=[],pending=[];
 const context={prepareCommitmentMoves,commitmentEditorDecisionLabels,$,element,overrides,commitmentDecision,planningReport:{items:[item],scope_totals:[{scope:'home',selected_count:0,monthly_total:0,monthly_to_cover:0,expected_contribution_offset:0,categories:[]}],subscription_decision_totals:[]},money:String,categoryColors:{},billingControl:()=>element('div'),renderPageHeroes:()=>{},render:async()=>{},save:()=>{writes.push(structuredClone(context.overrides));return new Promise(resolve=>pending.push(resolve))}};
 vm.runInNewContext(planning+';renderPlanning();',context);
 const unique=[...new Set(controls)],find=label=>unique.find(n=>n['aria-label']===label);
 const move=find('Example move to Work'),check=find('Example non-negotiable'),amount=find('Example baseline monthly amount');
 const moved=move.onclick();assert.equal(writes[0].commitments.Example.workBaselineAmount,600.01);assert.equal(writes[0].commitments.Example.workEssential,false);
 // A billing edit lands while the move's save is still pending.
 context.overrides.commitments.Example.billingFrequency='Annual';context.overrides.commitments.Example.billingCharge=240;
 check.checked=true;const selected=check.onchange();amount.value=25;const changed=amount.onchange();
 const latest=writes.at(-1).commitments.Example;
 assert.equal(latest.budgetScope,'work');assert.equal(latest.workEssential,true);assert.equal(latest.workBaselineAmount,25);
 assert.equal(latest.billingFrequency,'Annual');assert.equal(latest.billingCharge,240);assert.equal(latest.decision,'Keep');
 pending.forEach(resolve=>resolve(false));await Promise.all([moved,selected,changed]);
});

test('failed projection refresh clears category amount headings and dependent reports',async()=>{
 const source=readFileSync(new URL('../frontend/controller.js',import.meta.url),'utf8');
 const renderer=source.slice(source.indexOf('async function render(){'),source.indexOf('let visibleGroups='));
 const nodes=new Map(),$=id=>{if(!nodes.has(id))nodes.set(id,{value:'all',checked:false,textContent:'old amount',replaceChildren(){this.textContent=''}});return nodes.get(id)};
 $('category-title').textContent='Example · $123.00';
 let inspectorCleared=false;
 const context={$,sourceInspector:{clear:()=>{inspectorCleared=true}},localStorage:{getItem:()=>null},fetch:async()=>{throw Error('offline')},transactionRequest:0,transactionReport:{old:true},projectionRequest:0,currentReport:{old:true},allReport:{old:true},chartReport:{old:true},planningReport:{old:true},evidenceReport:{old:true},accountReport:{old:true},detailReports:[{}],cashReports:[{}],visibleGroups:new Set(),detailDimensions:[],data:{_revision:2}};
 await vm.runInNewContext(renderer+';render();',context);
 assert.equal($('category-title').textContent,'');assert.equal($('cash-table').textContent,'');assert.equal($('baseline-table').textContent,'');assert.equal($('card-snapshot-summary').textContent,'');
 assert.equal(inspectorCleared,true);assert.equal(context.currentReport,null);assert.equal(context.accountReport,null);assert.equal(context.planningReport,null);assert.equal(context.transactionReport,null);
 assert.equal($('more').hidden,true);assert.match($('save-status').textContent,/offline/);
});

import {createSaveQueue,loadWithSaveGuard} from '../frontend/save-queue.js';
import {createSourceInspector} from '../frontend/source-inspector.js';
test('refused reload preserves the transaction report and in-flight request identity',async()=>{
 const source=readFileSync(new URL('../frontend/controller.js',import.meta.url),'utf8'),loader=source.slice(source.indexOf('async function load(options={}'),source.indexOf('\ndocument.querySelectorAll',source.indexOf('async function load(options={}')));
 const nodes=new Map(),$=id=>{if(!nodes.has(id))nodes.set(id,{textContent:''});return nodes.get(id)};
 const report={summary:{record_count:3}},draft={notes:'unsaved'},context={editorGeneration:0,editorDraftSnapshot:()=>null,$,loadWithSaveGuard,queuedSave:{pending:0,activity:0},overrides:draft,hasUnsavedChanges:()=>true,updateDraftRecovery:()=>{},transactionRequest:7,transactionReport:report,fetch:async()=>{throw Error('Unexpected read')}};
 await vm.runInNewContext(loader+';load();',context);
 assert.equal(context.transactionRequest,7);assert.equal(context.transactionReport,report);assert.equal(context.overrides,draft);assert.match($('save-status').textContent,/Unsaved edits/);
 context.hasUnsavedChanges=()=>false;context.fetch=async()=>{throw Error('offline')};await vm.runInNewContext('load();',context);assert.equal(context.transactionRequest,7);assert.equal(context.transactionReport,report);assert.match($('save-status').textContent,/offline/);
});

test('cash hero uses core evidence status and avoids a spendable-balance or financing-source conclusion',()=>{
 const source=readFileSync(new URL('../frontend/controller.js',import.meta.url),'utf8'),renderer=source.slice(source.indexOf('function renderPageHeroes(){'),source.indexOf('function openTab(')),nodes=new Map();
 const element=(tag,text)=>({tag,text,style:{},className:'',children:[],append(...children){this.children.push(...children)},replaceChildren(...children){this.children=children}}),$=id=>{if(!nodes.has(id))nodes.set(id,element('div'));return nodes.get(id)};
 $('period').value='2026-06';const metric=n=>({period_total:n,recorded_average_per_selected_month:n}),report={measures:{payroll_received:metric(0),reimbursement_received:metric(0),spending_commitment:metric(10),unallocated_received:metric(0),expected_contribution:metric(0),incoming_with_expected_funding:metric(0),funding_less_spending:metric(-10)},funding_comparison:{monthly_recorded_difference:null,missing_income_evidence_months:['2026-06']}};
 const context={coreMoneyCard,$,element,currentReport:report,rows:()=>[],data:{months:['2026-06']},reportMeasure:key=>report.measures[key].period_total,planningItems:()=>[],money:String,activeTab:'cash',localStorage:{getItem:()=>null}};
 const text=node=>[node.text||'',...node.children.map(text)].join(' ');vm.runInNewContext(renderer+';renderPageHeroes();',context);let rendered=text($('page-heroes'));assert.match(rendered,/INCOME EVIDENCE INCOMPLETE/);assert.match(rendered,/Not established/);assert.doesNotMatch(rendered,/MONTHLY SPENDING GAP|MONTHLY INCOME REMAINING|Credit cards or savings may/);
 report.funding_comparison={monthly_recorded_difference:90,missing_income_evidence_months:[]};report.measures.funding_less_spending=metric(90);vm.runInNewContext('renderPageHeroes();',context);rendered=text($('page-heroes'));assert.match(rendered,/RECORDED FUNDING COMPARISON/);assert.match(rendered,/not a spendable balance/);assert.doesNotMatch(rendered,/MONTHLY INCOME REMAINING/);
});

test('confirmed notes save restores the source inspector without a full dashboard render',async()=>{
 const source=readFileSync(new URL('../frontend/controller.js',import.meta.url),'utf8'),callback=source.slice(source.indexOf('const queuedSave=createSaveQueue('),source.indexOf('function updateDraftRecovery()'));
 const previous=globalThis.document,node=tag=>({tag,textContent:'',children:[],append(...children){this.children.push(...children)},replaceChildren(...children){this.children=children}});globalThis.document={createElement:node,querySelectorAll:()=>[]};
 try{const host=node('div'),status=node('p'),more=node('button'),data={_revision:3},queried=[];const inspector=createSourceInspector({host,status,more,getContext:()=>({revision:data._revision}),request:async()=>{queried.push(data._revision);return {revision:data._revision,total:0,items:[],summary:{candidate_links:0,candidate_targets_missing:0},accepted_matches:0};}});
 await inspector.refresh();const context={refreshContextDisplay:()=>{},document:{querySelectorAll:()=>[]},createSaveQueue,structuredClone,data,sourceInspector:inspector,recordSourceReader:{invalidate(){}},fetch:async()=>({ok:true,status:200,json:async()=>({revision:4})}),confirmedDecisions:{},transactionRequest:0,transactionReport:{old:true}};
 const saved=await vm.runInNewContext(callback+';queuedSave({notes:"Updated notes"});',context);await Promise.resolve();assert.equal(saved.ok,true);assert.equal(data._revision,4);assert.deepEqual(queried,[3,4]);assert.match(status.textContent,/0 original source records/);assert.doesNotMatch(status.textContent,/unavailable/);assert.equal(context.transactionReport,null);
 }finally{globalThis.document=previous;}
});

test('applied reload invalidates editor source evidence while refused and failed reloads retain it',async()=>{
 const source=readFileSync(new URL('../frontend/controller.js',import.meta.url),'utf8'),loader=source.slice(source.indexOf('async function load(options={}'),source.indexOf('\ndocument.querySelectorAll',source.indexOf('async function load(options={}')));
 const nodes=new Map(),$=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',replaceChildren(){},append(){}});return nodes.get(id)};let invalidations=0;
 const snapshot={_revision:4,transactions:[],overrides:{transactions:{},budgets:{},commitments:{},notes:'saved'}},context={editorGeneration:0,editorDraftSnapshot:()=>null,$,loadWithSaveGuard,structuredClone,queuedSave:{pending:0,activity:0},data:{_revision:3},overrides:{notes:'saved'},hasUnsavedChanges:()=>true,updateDraftRecovery:()=>{},recordSourceReader:{invalidate(){invalidations++;}},transactionRequest:0,transactionReport:{},document:{querySelectorAll:()=>[]},Option:function(){},render(){},fetch:async()=>({ok:true,json:async()=>snapshot})};
 await vm.runInNewContext(loader+';load();',context);assert.equal(invalidations,0);context.hasUnsavedChanges=()=>false;context.fetch=async()=>{throw Error('offline')};await vm.runInNewContext('load();',context);assert.equal(invalidations,0);
 context.fetch=async()=>({ok:true,json:async()=>snapshot});await vm.runInNewContext('load();',context);assert.equal(invalidations,1);assert.equal(context.data._revision,4);assert.equal($('editor').hidden,true);assert.equal(context.editorHasUnsavedChanges(),false);
});
test('actual reload guards raw editor edits across pending normal and discard reads',async()=>{
 const source=readFileSync(new URL('../frontend/controller.js',import.meta.url),'utf8'),loader=source.slice(source.indexOf('async function load(options={}'),source.indexOf('\ndocument.querySelectorAll',source.indexOf('async function load(options={}')));
 for(const discardDraft of [false,true]){const nodes=new Map(),$=id=>{if(!nodes.has(id))nodes.set(id,{hidden:false,textContent:'',replaceChildren(){},append(){}});return nodes.get(id)};let fields={category:'Flight'},finishRead,invalidations=0;const context={editorGeneration:1,editorDraftSnapshot:()=>fields,$,loadWithSaveGuard,structuredClone,queuedSave:{pending:0,activity:0},data:{_revision:3},overrides:{notes:''},hasUnsavedChanges:()=>false,updateDraftRecovery(){},recordSourceReader:{invalidate(){invalidations++;}},transactionRequest:0,transactionReport:{},document:{querySelectorAll:()=>[]},Option:function(){},render(){},fetch:()=>new Promise(resolve=>finishRead=resolve)};
  const pending=vm.runInNewContext(loader+';load({discardDraft:'+discardDraft+'});',context);fields={category:'New choice during read'};finishRead({ok:true,json:async()=>({_revision:4,transactions:[],overrides:{transactions:{},budgets:{},commitments:{},notes:''}})});await pending;assert.equal(context.data._revision,3);assert.equal(invalidations,0);assert.equal($('editor').hidden,false);assert.match($('save-status').textContent,/Edits changed during reload/);
 }
});
