export function recordQuery(rows,months,options={}){
 if(options.record_ids!==undefined&&(!Array.isArray(options.record_ids)||options.record_ids.length>5000||options.record_ids.some(id=>typeof id!=='string')))throw Error('Invalid record selection');
 const search=(options.search||'').toLowerCase(),ids=options.record_ids?new Set(options.record_ids):null;
 if(search.length>300)throw Error('Search too long');
 const filtered=rows.filter(r=>(!ids||ids.has(r.id))&&(!search||String(r.merchant||'').concat(' ',r.description||'').toLowerCase().includes(search))&&(!options.account||r.account===options.account)&&(!options.purpose||r.purpose===options.purpose)&&(!options.month||r.month===options.month)).sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id));
 const offset=options.offset??0,limit=options.limit??100;
 if(!Number.isInteger(offset)||offset<0||!Number.isInteger(limit)||limit<1||limit>200)throw Error('Invalid record pagination');
 const spend=filtered.filter(r=>r.scope==='Household').reduce((n,r)=>n+Math.round((r.spend||0)*100),0);
 return {items:filtered.slice(offset,offset+limit),total:filtered.length,offset,limit,next_offset:offset+limit<filtered.length?offset+limit:null,summary:{record_count:filtered.length,account_count:new Set(filtered.map(r=>r.account)).size,spending:{period_total:spend/100,recorded_average_per_selected_month:months.length?Math.round(spend/months.length)/100:null,status:'Recorded matching spending; source completeness unverified'}},complete:false};
}
