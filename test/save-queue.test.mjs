import test from 'node:test';import assert from 'node:assert/strict';import {createSaveQueue} from '../frontend/save-queue.js';
test('overlapping edits capture separate drafts and write using the latest confirmed revision',async()=>{
 let revision=1,release;const gate=new Promise(resolve=>release=resolve),seen=[],save=createSaveQueue(async document=>{seen.push({revision,document});if(seen.length===1)await gate;revision++;return {ok:true,revision};});
 const draft={budgets:{Food:100}},first=save(draft);draft.budgets.Food=200;const second=save(draft);await Promise.resolve();assert.equal(seen.length,1);release();assert.equal((await first).ok,true);assert.equal((await second).ok,true);assert.deepEqual(seen,[{revision:1,document:{budgets:{Food:100}}},{revision:2,document:{budgets:{Food:200}}}]);
});
test('a failed write prevents already queued drafts from being sent blindly',async()=>{
 let calls=0;const save=createSaveQueue(async()=>{calls++;return {ok:false,reason:'Conflict'};}),first=save({notes:'one'}),second=save({notes:'two'});assert.equal((await first).ok,false);assert.match((await second).reason,/queued draft/);assert.equal(calls,1);await save({notes:'explicit later edit'});assert.equal(calls,2);
});
import {loadWithSaveGuard} from '../frontend/save-queue.js';
test('reload cannot install an old snapshot while a save waits for acknowledgement',async()=>{
 let release,state={revision:1,notes:'old'},draft={notes:'new'};const gate=new Promise(resolve=>release=resolve),save=createSaveQueue(async document=>{await gate;state={revision:2,...document};return {ok:true};}),pending=save(draft);
 await assert.rejects(loadWithSaveGuard(save,{draft:()=>draft,read:async()=>({revision:1,notes:'old'}),apply:value=>state=value}),/pending saves/);release();await pending;assert.deepEqual(state,{revision:2,notes:'new'});
});
test('reload discards its response if a save starts and finishes while the read is pending',async()=>{
 let release,state={revision:1,notes:'old'},draft={notes:'new'};const gate=new Promise(resolve=>release=resolve),save=createSaveQueue(async document=>{state={revision:2,...document};return {ok:true};});
 const read=loadWithSaveGuard(save,{draft:()=>draft,read:async()=>{await gate;return {revision:1,notes:'old'};},apply:value=>state=value});await save(draft);release();await assert.rejects(read,/changed during reload/);assert.deepEqual(state,{revision:2,notes:'new'});
});
test('failed-save draft blocks ordinary reload; explicit discard reloads without overriding later edits',async()=>{
 let persisted={notes:'saved'},draft={notes:'unsaved'},reads=0,confirmed=JSON.stringify(persisted);
 const queue=createSaveQueue(async()=>({ok:false,reason:'offline'}));await queue(draft);
 const options={draft:()=>draft,hasUnsavedChanges:()=>JSON.stringify(draft)!==confirmed,read:async()=>{reads++;return structuredClone(persisted)},apply:value=>{draft=value;confirmed=JSON.stringify(value)}};
 await assert.rejects(loadWithSaveGuard(queue,options),/Unsaved edits/);assert.equal(reads,0);assert.equal(draft.notes,'unsaved');
 await loadWithSaveGuard(queue,{...options,discardDraft:true});assert.equal(draft.notes,'saved');assert.equal(reads,1);
 draft={notes:'another unsaved draft'};let release;const gate=new Promise(resolve=>release=resolve);
 const reload=loadWithSaveGuard(queue,{...options,discardDraft:true,read:async()=>{await gate;return persisted}});draft.notes='newer edit during reload';release();await assert.rejects(reload,/changed during reload/);assert.equal(draft.notes,'newer edit during reload');
});
test('explicit discard cannot bypass pending saves and a failed read leaves the draft intact',async()=>{
 let release,draft={notes:'keep'},applied=false;const gate=new Promise(resolve=>release=resolve),queue=createSaveQueue(async()=>{await gate;return {ok:false}}),pending=queue(draft);
 const options={draft:()=>draft,hasUnsavedChanges:()=>true,discardDraft:true,read:async()=>{throw Error('read offline')},apply:()=>applied=true};
 await assert.rejects(loadWithSaveGuard(queue,options),/pending saves/);release();await pending;await assert.rejects(loadWithSaveGuard(queue,options),/read offline/);assert.equal(draft.notes,'keep');assert.equal(applied,false);
});
