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
 const overrides={commitments:{Example:{decision:'Keep',billingFrequency:'Monthly',billingCharge:20}}};
 const item={name:'Example',assigned_scope:'home',essential:false,baseline_monthly_amount:20,recorded_average_per_selected_month:20,observed_month_count:3,evidence_month_count:3,subscription_candidate:false};
 const writes=[],pending=[];
 const context={$,element,overrides,commitmentDecision,planningReport:{items:[item],scope_totals:[{scope:'home',selected_count:0,monthly_total:0,monthly_to_cover:0,expected_contribution_offset:0,categories:[]}],subscription_decision_totals:[]},money:String,categoryColors:{},billingControl:()=>element('div'),renderPageHeroes:()=>{},render:async()=>{},save:()=>{writes.push(structuredClone(overrides));return new Promise(resolve=>pending.push(resolve))}};
 vm.runInNewContext(planning+';renderPlanning();',context);
 const unique=[...new Set(controls)],find=label=>unique.find(n=>n['aria-label']===label);
 const move=find('Example move to Work'),check=find('Example non-negotiable'),amount=find('Example baseline monthly amount');
 const moved=move.onclick();
 // A billing edit lands while the move's save is still pending.
 overrides.commitments.Example.billingFrequency='Annual';overrides.commitments.Example.billingCharge=240;
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
 const context={$,localStorage:{getItem:()=>null},fetch:async()=>{throw Error('offline')},transactionRequest:0,transactionReport:{old:true},projectionRequest:0,currentReport:{old:true},allReport:{old:true},chartReport:{old:true},planningReport:{old:true},evidenceReport:{old:true},accountReport:{old:true},detailReports:[{}],cashReports:[{}],visibleGroups:new Set(),detailDimensions:[],data:{_revision:2}};
 await vm.runInNewContext(renderer+';render();',context);
 assert.equal($('category-title').textContent,'');assert.equal($('cash-table').textContent,'');assert.equal($('baseline-table').textContent,'');assert.equal($('card-snapshot-summary').textContent,'');
 assert.equal(context.currentReport,null);assert.equal(context.accountReport,null);assert.equal(context.planningReport,null);assert.equal(context.transactionReport,null);
 assert.equal($('more').hidden,true);assert.match($('save-status').textContent,/offline/);
});

import {loadWithSaveGuard} from '../frontend/save-queue.js';
test('refused reload preserves the transaction report and in-flight request identity',async()=>{
 const source=readFileSync(new URL('../frontend/controller.js',import.meta.url),'utf8'),loader=source.slice(source.indexOf('async function load(options={}'),source.indexOf('\ndocument.querySelectorAll',source.indexOf('async function load(options={}')));
 const nodes=new Map(),$=id=>{if(!nodes.has(id))nodes.set(id,{textContent:''});return nodes.get(id)};
 const report={summary:{record_count:3}},draft={notes:'unsaved'},context={$,loadWithSaveGuard,queuedSave:{pending:0,activity:0},overrides:draft,hasUnsavedChanges:()=>true,updateDraftRecovery:()=>{},transactionRequest:7,transactionReport:report,fetch:async()=>{throw Error('Unexpected read')}};
 await vm.runInNewContext(loader+';load();',context);
 assert.equal(context.transactionRequest,7);assert.equal(context.transactionReport,report);assert.equal(context.overrides,draft);assert.match($('save-status').textContent,/Unsaved edits/);
 context.hasUnsavedChanges=()=>false;context.fetch=async()=>{throw Error('offline')};await vm.runInNewContext('load();',context);assert.equal(context.transactionRequest,7);assert.equal(context.transactionReport,report);assert.match($('save-status').textContent,/offline/);
});
