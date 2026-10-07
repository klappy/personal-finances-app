import {empty,operate} from './core.mjs';
import {normalizeDashboardSnapshot} from './snapshot.mjs';
// Pure compatibility normalization. Reads never persist migrations or invent timestamps.
export async function legacyState(snapshot,revision) {
 const normalized=normalizeDashboardSnapshot(snapshot),state=empty();
 await operate(state,'import_preview',{format:'dashboard_snapshot',snapshot});
 for(const r of normalized.rows){state.sources[JSON.stringify([r.source_id,r.source_line])]=r;state.transactions[r.transaction_id]={id:r.transaction_id,account:r.account,merchant:r.merchant,date:r.date,amount:r.amount,spend:r.spend,classification:r.classification,attributes:r.attributes};}
 state.dashboard_context=normalized.context;state.revision=revision;state.storage_format='finance-core@1';return state;
}
export function d1Store(db,actor,provider=null){return async(name,args)=>{
 const row=await db.prepare("SELECT value,revision FROM app_state WHERE key='ledger'").first();if(!row)throw Error('Ledger unavailable');
 const stored=JSON.parse(row.value),state=Array.isArray(stored.transactions)?await legacyState(stored,row.revision):stored;
 if(state.revision!==row.revision)throw Error('Stored revision mismatch');
 const result=await operate(state,name,args,actor,provider);
 if(state.revision!==row.revision){const outcome=await db.prepare("UPDATE app_state SET value=?,revision=?,updated_by=?,updated_at=? WHERE key='ledger' AND revision=?").bind(JSON.stringify(state),state.revision,actor,new Date().toISOString(),row.revision).run();if(outcome.meta.changes!==1)throw Error('Revision conflict: concurrent save');}
 return result;
};}
