import test from 'node:test';import assert from 'node:assert/strict';import {dispatch,toolDefinitions} from '../tools.mjs';import {empty,operate} from '../core.mjs';
test('four-capability surface exposes operation schemas and rejects malformed envelopes',async()=>{
 const s=empty(),call=(n,a)=>operate(s,n,a,'fixture');assert.deepEqual(toolDefinitions.map(t=>t.name),['docs','query','project','execute']);const docs=await dispatch('docs',{},call);assert.ok(docs.operations.some(x=>x.name==='decision_update'));assert.equal(docs.surface.length,4);
 await assert.rejects(dispatch('project',{operation:'decision_update',args:{}},call),/Invalid option/);await assert.rejects(dispatch('query',{limit:1.5},call),/integer/);await assert.rejects(dispatch('execute',{operation:'decision_update',args:{revision:0,decisions:{transactions:{},budgets:{},commitments:{},notes:'x'},actor:'spoof'}},call),/Unknown argument/);assert.equal(s.revision,0);
});
