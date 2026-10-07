import test from 'node:test';import assert from 'node:assert/strict';import {dispatch,toolDefinitions} from '../tools.mjs';import {empty,operate} from '../core.mjs';
test('four-capability surface exposes operation schemas and rejects malformed envelopes',async()=>{
 const s=empty(),call=(n,a)=>operate(s,n,a,'fixture');assert.deepEqual(toolDefinitions.map(t=>t.name),['docs','query','project','execute']);const docs=await dispatch('docs',{},call);assert.ok(docs.operations.some(x=>x.name==='decision_update'));assert.equal(docs.surface.length,4);
 await assert.rejects(dispatch('project',{operation:'decision_update',args:{}},call),/Invalid option/);await assert.rejects(dispatch('query',{limit:1.5},call),/integer/);await assert.rejects(dispatch('execute',{operation:'decision_update',args:{revision:0,decisions:{transactions:{},budgets:{},commitments:{},notes:'x'},actor:'spoof'}},call),/Unknown argument/);assert.equal(s.revision,0);
});
test('discovery catalogs every executable action and complete export uses the existing read capability',async()=>{
 const state=empty(),before=JSON.stringify(state),call=(name,args)=>operate(state,name,args,'fixture');
 const coreDocs=await call('docs',{}),docs=await dispatch('docs',{},call);
 assert.deepEqual(coreDocs.capabilities,docs.operations.map(x=>x.name));assert.ok(coreDocs.capabilities.includes('decision_update'));
 assert.deepEqual(coreDocs.operations,docs.operations);assert.deepEqual(Object.keys(docs.operation_routes).sort(),docs.capabilities.toSorted());
 const route=docs.operation_routes.export;assert.equal(route.capability,'query');
 assert.deepEqual(await dispatch(route.capability,route.args,call),await call('export',{}));assert.equal(JSON.stringify(state),before);
 for(const op of docs.operations){const destination=docs.operation_routes[op.name];assert.ok(docs.surface.some(tool=>tool.name===destination.capability));if(destination.operation){const tool=docs.surface.find(tool=>tool.name===destination.capability);assert.ok(tool.inputSchema.properties.operation.enum.includes(destination.operation));}}
});
test('discovery responses cannot mutate the shared executable catalog',async()=>{
 const call=(name,args)=>operate(empty(),name,args,'fixture');
 const first=await dispatch('docs',{},call);first.operations[0].name='corrupted';first.operation_routes.export.args.collection='snapshot';first.surface[0].name='corrupted';
 const second=await dispatch('docs',{},call);assert.equal(second.operations[0].name,'docs');assert.equal(second.operation_routes.export.args.collection,'ledger');assert.equal(second.surface[0].name,'docs');
 const direct=await call('docs',{});direct.operations[0].name='corrupted';assert.equal((await call('docs',{})).operations[0].name,'docs');
});
