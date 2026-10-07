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
