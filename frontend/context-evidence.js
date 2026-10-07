// Presentation only: all custody classifications are supplied by the shared core.
export function contextField(snapshot,path){return snapshot.context_evidence?.fields?.find(field=>JSON.stringify(field.path)===JSON.stringify(path))||null;}
export function contextFieldText(snapshot,path){
 const field=contextField(snapshot,path);if(!field)return 'Historical reference unavailable';
 const value=field.presence==='missing'?'Unavailable':field.value===null?'Not recorded':typeof field.value==='object'?'Historical value requires review':String(field.value);
 const stale=snapshot.context_evidence.revision!==snapshot._revision?' · evidence from an earlier revision; reload to refresh':'';
 return value+' · '+field.label+stale;
}
export function coreMoneyCard(label,metric,note,money){
 if(!metric||typeof metric!=='object')return [label,'Unavailable','Shared metric unavailable'];
 const amount=value=>typeof value==='number'&&Number.isFinite(value)?money(value):'Unavailable';
 return [label,amount(metric.recorded_average_per_selected_month)+(typeof metric.recorded_average_per_selected_month==='number'?'/mo':''),amount(metric.period_total)+' period total · '+(metric.estimated_component>0?metric.status:note)];
}
