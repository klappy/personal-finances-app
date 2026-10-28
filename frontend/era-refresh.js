export function eraRefreshLabel(snapshot){
 const feed=snapshot.era_refresh;
 if(!feed)return '';
 return `Posted feed retrieved ${feed.last_success_at} for ${feed.from_date}–${feed.to_date}; ${feed.record_count} records across ${feed.account_count} configured accounts. New classifications and statement completeness remain unverified. Historical snapshot: ${snapshot.as_of||'date unavailable'}.`;
}
export function refreshPeriodOptions(snapshot){
 if(!snapshot.era_refresh)return null;
 const label=month=>new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(month+'-15T00:00:00Z'));
 return [{value:'all',label:'Baseline period · '+snapshot.months.map(label).join(', ')},...snapshot.available_months.map(month=>({value:month,label:label(month)+' · completeness unverified'}))];
}
