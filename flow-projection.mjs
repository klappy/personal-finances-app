import {classificationGroups} from './dashboard-domain.mjs';
import {aggregateFlows} from './flows.mjs';

const dollars=n=>n/100,cents=n=>Math.round(n*100);
// Pure projection over typed flows. Kind remains part of every aggregate;
// settlements cannot be combined with purchases under an "outflow" total.
export function flowProjection(flows,months,dimensions=['kind','group'],planning={}){
 if(!Array.isArray(months)||!months.length||months.length>24||months.some(m=>!/^\d{4}-(0[1-9]|1[0-2])$/.test(m)))throw Error('Projection requires 1–24 valid months');
 if(dimensions.includes('month'))throw Error('Series dimensions exclude month');
 if(!dimensions.includes('kind'))throw Error('Series must preserve kind');
 const selected=[...new Set(months)].sort(),rows=flows.filter(r=>selected.includes(r.month));
 const totals=aggregateFlows(rows,dimensions);
 const keyFor=row=>JSON.stringify(dimensions.map(k=>row[k]??null));
 const monthlyIndex=new Map(),denominators=new Map(),lineage=new Map();
 for(const row of rows){
  const key=keyFor(row),monthKey=JSON.stringify([row.month,key]),kindKey=JSON.stringify([row.month,row.kind]);
  const cell=monthlyIndex.get(monthKey)||{cents:0,count:0};cell.cents+=cents(row.amount);cell.count++;monthlyIndex.set(monthKey,cell);
  denominators.set(kindKey,(denominators.get(kindKey)||0)+cents(row.amount));
  const evidence=lineage.get(key)||{ids:new Set(),certainty:new Set(),refs:new Map()};
  if(row.transaction_id)evidence.ids.add(row.transaction_id);if(row.certainty)evidence.certainty.add(row.certainty);
  for(const ref of row.source_refs||[])evidence.refs.set(JSON.stringify([ref.source_id,ref.source_line]),ref);
  lineage.set(key,evidence);
 }
 const series=totals.map(total=>{
  const key=keyFor(total.dimensions),evidence=lineage.get(key);
  const values=selected.map(month=>{const cell=monthlyIndex.get(JSON.stringify([month,key])),denominator=denominators.get(JSON.stringify([month,total.dimensions.kind]));return{month,recorded_total:cell?dollars(cell.cents):null,record_count:cell?.count??0,recorded_share_percent:denominator?Math.round((cell?.cents||0)/denominator*10000)/100:null,complete:false};});
  const shares=values.filter(r=>r.recorded_share_percent!==null);
  return {...total,certainty:[...evidence.certainty],transaction_ids:[...evidence.ids],source_refs:[...evidence.refs.values()],period_total:total.amount,recorded_average_per_selected_month:dollars(Math.round(cents(total.amount)/selected.length)),monthly:values,average_recorded_monthly_share_percent:shares.length?Math.round(shares.reduce((n,r)=>n+r.recorded_share_percent,0)/shares.length*100)/100:null,share_observed_month_count:shares.length,verified_min_month:null,verified_max_month:null,verified_average_month:null};
 });
 const monthly_kind_totals=[...new Set(rows.map(r=>r.kind))].flatMap(kind=>selected.map(month=>{const value=denominators.get(JSON.stringify([month,kind]));return {kind,month,recorded_total:value===undefined?null:dollars(value),complete:false};}));
 const kind_totals=aggregateFlows(rows,['kind']).map(r=>({...r,recorded_average_per_selected_month:dollars(Math.round(cents(r.amount)/selected.length))}));
 const amountFor=kinds=>dollars(rows.filter(r=>kinds.includes(r.kind)).reduce((n,r)=>n+cents(r.amount),0));
 const metric=amount=>({period_total:amount,recorded_average_per_selected_month:dollars(Math.round(cents(amount)/selected.length))});
 const payroll=amountFor(['payroll_received','earned_income_received','estimated_payroll_allocation']),reimbursement=amountFor(['reimbursement_received','estimated_reimbursement_allocation']),spending=amountFor(['spending_commitment']);
 const expectedMonthly=planning.expected_contribution_monthly??null;if(expectedMonthly!==null&&(!Number.isFinite(expectedMonthly)||expectedMonthly<0))throw Error('Invalid planned contribution');
 const expected=expectedMonthly===null?0:dollars(cents(expectedMonthly)*selected.length),wifeReceived=amountFor(['wife_funding_received']);
 const expectedRemaining=expectedMonthly===null?0:dollars(selected.reduce((n,month)=>n+Math.max(0,cents(expectedMonthly)-rows.filter(r=>r.month===month&&r.kind==='wife_funding_received').reduce((sum,r)=>sum+cents(r.amount),0)),0));
 const incoming=dollars(cents(payroll)+cents(reimbursement)+cents(wifeReceived)+cents(expectedRemaining));
 const allocationMetric=(amount,estimatedKind)=>{const estimated=amountFor([estimatedKind]);return {...metric(amount),recorded_component:dollars(cents(amount)-cents(estimated)),estimated_component:estimated,status:estimated?'Includes estimated allocation; payment matching not certified':'Recorded received flow; source reconciliation not certified'};};
 const measures={payroll_received:allocationMetric(payroll,'estimated_payroll_allocation'),reimbursement_received:allocationMetric(reimbursement,'estimated_reimbursement_allocation'),spending_commitment:metric(spending),wife_funding_received:metric(wifeReceived),expected_contribution_remaining:{...metric(expectedRemaining),status:'Expected funding less classified receipts per month; payment matching not certified'},unallocated_received:metric(amountFor(['mixed_business_inflow'])),expected_contribution:{...metric(expected),status:expectedMonthly===null?'unknown':'planned; deposits not matched'},incoming_with_expected_funding:metric(incoming),funding_less_spending:{...metric(dollars(cents(incoming)-cents(spending))),status:'Recorded funding less spending commitments; not verified bank cash flow'}};
 const incomeKinds=['payroll_received','earned_income_received','reimbursement_received','wife_funding_received'],estimatedIncomeKinds=['estimated_payroll_allocation','estimated_reimbursement_allocation'];
 const incomeMonths=selected.filter(month=>rows.some(row=>row.month===month&&incomeKinds.includes(row.kind))),missingIncomeMonths=selected.filter(month=>!incomeMonths.includes(month));
 const estimatedIncomeOnlyMonths=missingIncomeMonths.filter(month=>rows.some(row=>row.month===month&&estimatedIncomeKinds.includes(row.kind)));
 const funding_comparison={income_observed_months:incomeMonths,estimated_income_only_months:estimatedIncomeOnlyMonths,missing_income_evidence_months:missingIncomeMonths,monthly_recorded_difference:missingIncomeMonths.length?null:measures.funding_less_spending.recorded_average_per_selected_month,status:missingIncomeMonths.length?'No classified income evidence for selected months':'Recorded funding comparison only',cash_flow_verified:false,spendable_balance_verified:false};
 const contribution_plan={items:Object.entries(planning.contribution_plan||{}).map(([bill,value])=>{if(!Number.isFinite(value)||value<0)throw Error('Invalid contribution plan');return {bill,monthly_amount:value};}),monthly_total:expectedMonthly,status:'Expected contribution arrangement; classified receipts do not certify payment matching'};
 const targets=planning.budget_targets||{},categories=[...new Set([...classificationGroups,...rows.filter(r=>r.kind==='spending_commitment').map(r=>r.group),...Object.keys(targets)])].filter(Boolean);
 const budgetItems=categories.map(category=>{const values=rows.filter(r=>r.kind==='spending_commitment'&&r.group===category),target=targets[category]??null;if(target!==null&&(!Number.isFinite(target)||target<0))throw Error('Invalid budget target');return {category,recorded_average_per_selected_month:values.length?dollars(Math.round(values.reduce((n,r)=>n+cents(r.amount),0)/selected.length)):null,monthly_target:target};});
 const targetTotal=dollars(budgetItems.reduce((n,item)=>n+cents(item.monthly_target??0),0)),payrollMonthly=measures.payroll_received.recorded_average_per_selected_month;
 const budget_comparison={items:budgetItems,planned_category_count:budgetItems.filter(item=>item.monthly_target!==null).length,category_count:budgetItems.length,monthly_target_total:targetTotal,payroll_funding_monthly:payrollMonthly,payroll_recorded_monthly:dollars(Math.round(cents(measures.payroll_received.recorded_component)/selected.length)),payroll_estimated_monthly:dollars(Math.round(cents(measures.payroll_received.estimated_component)/selected.length)),payroll_status:measures.payroll_received.status,payroll_less_targets:dollars(cents(payrollMonthly)-cents(targetTotal)),status:'Saved category targets are shared across scopes; recorded averages and plan completeness are unverified'};
 return {funding_comparison,contribution_plan,budget_comparison,months:selected,dimensions,series,kind_totals,monthly_kind_totals,measures,complete:false,statistics_status:'Recorded averages only; source completeness unverified. Shares use months with recorded flows of the same kind.'};
}
