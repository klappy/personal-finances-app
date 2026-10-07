import {commitmentDecision} from './commitment-projection.mjs';
export const commitmentMoveSchema={type:'array',maxItems:500,items:{type:'object',additionalProperties:false,required:['name','to_scope','seed_essential','seed_monthly_amount'],properties:{name:{type:'string',maxLength:300},to_scope:{type:'string',enum:['home','work']},seed_essential:{type:'boolean'},seed_monthly_amount:{type:'number',minimum:0}}}};
export function prepareCommitmentMoves(decisions,moves=[]){
 if(!Array.isArray(moves)||moves.length>500)throw Error('Invalid commitment moves');const prepared=structuredClone(decisions),seen=new Map(),changes=[];
 for(const move of moves){if(!move||Object.keys(move).some(key=>!['name','to_scope','seed_essential','seed_monthly_amount'].includes(key))||typeof move.name!=='string'||!move.name||move.name.length>300||['__proto__','constructor','prototype'].includes(move.name)||!['home','work'].includes(move.to_scope)||typeof move.seed_essential!=='boolean'||!Number.isFinite(move.seed_monthly_amount)||move.seed_monthly_amount<0)throw Error('Invalid commitment move');const signature=JSON.stringify([move.to_scope,move.seed_essential,move.seed_monthly_amount]);if(seen.has(move.name)){if(seen.get(move.name)!==signature)throw Error('Conflicting duplicate commitment move');continue;}seen.set(move.name,signature);
  const decision=commitmentDecision(prepared.commitments[move.name]),essential=move.to_scope==='work'?'workEssential':'essential',amount=move.to_scope==='work'?'workBaselineAmount':'baselineAmount',preserved_fields=[],seeded_fields=[];
  for(const [field,seed] of [[essential,move.seed_essential],[amount,move.seed_monthly_amount]])if(Object.hasOwn(decision,field))preserved_fields.push(field);else{decision[field]=seed;seeded_fields.push(field);}
  decision.budgetScope=move.to_scope;prepared.commitments[move.name]=decision;changes.push({name:move.name,to_scope:move.to_scope,preserved_fields,seeded_fields});
 }
 return {prepared_decisions:prepared,planning_changes:changes};
}
