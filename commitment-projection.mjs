import {commitmentBillingFrequencies,commitmentDecisionLabels} from './commitment-contract.mjs';
import {planningItems} from './dashboard-domain.mjs';
const cents=value=>{const number=Number(value);if(!Number.isFinite(number)||number<0)throw Error('Invalid planning amount');return Math.round(number*100);};
const money=value=>value/100;
export const commitmentDecision=value=>typeof value==='string'?{decision:value}:value&&typeof value==='object'&&!Array.isArray(value)?structuredClone(value):{};
const contributionLabel=name=>name==='T-Mobile'?'Phone':name==='Progressive'?'Car insurance':name;
function budgetCategory(item,scope){
 if(scope==='home')return item.group;
 const text=(item.name+' '+item.rr.map(r=>r.category+' '+r.description).join(' ')).toLowerCase();
 return item.rr.some(r=>r.original_group==='Travel'||r.group==='Travel')?'Work travel':/cloudflare|twilio|github|domain|hosting/.test(text)?'Infrastructure and development':/cursor|open\s*ai|anthropic|claude|grok|lovable|elevenlabs|replicate|mori|fyxer/.test(text)?'AI':/equipment|device|appliance/.test(text)?'Equipment':'Other work services';
}
// Planning is composed from gross billing evidence and saved decisions. Received
// reimbursement visibility never removes an ongoing commitment candidate.
export function commitmentProjection(rows,months,decisions={},contributions={}){
 if(!Array.isArray(months)||!months.length||months.length>24)throw Error('Planning requires selected evidence months');
 const items=planningItems(rows,months).map(item=>{
  const saved=decisions[item.name],state=commitmentDecision(saved);
  const assigned_scope=state.budgetScope||(item.work?'work':'home');
  if(!['home','work'].includes(assigned_scope))throw Error('Invalid planning scope');
  const billing_frequency=state.billingFrequency||(item.rr.length===1?'Annual':'Monthly');
  if(!commitmentBillingFrequencies.includes(billing_frequency))throw Error('Invalid billing frequency');
  const charge=cents(state.billingCharge??item.latest),monthly=billing_frequency==='Annual'?Math.round(charge/12):billing_frequency==='One-time'?0:charge;
  const amount=cents((assigned_scope==='work'?state.workBaselineAmount:state.baselineAmount)??state.target??money(monthly));
  const essential=Boolean(assigned_scope==='work'?state.workEssential:state.essential);
  const period=item.rr.reduce((n,r)=>n+cents(r.spend),0),source_refs=[...new Map(item.rr.flatMap(r=>r.source_refs||[]).map(ref=>[JSON.stringify([ref.source_id,ref.source_line]),ref])).values()];
  const expected=assigned_scope==='home'&&essential?Math.min(amount,cents(contributions[contributionLabel(item.name)]??0)):0;
  const bill_candidate=item.rr.some(r=>r.purpose==='Business'||['Housing','Debt','Insurance','Giving','Digital services','AI','Business'].includes(r.group));
  const subscription=['AI','Digital services'].includes(item.group)||item.rr.some(r=>['AI','Digital services'].includes(r.original_group));
  const evidenceMonthly=months.map(month=>{const charges=item.rr.filter(r=>r.month===month);return {month,recorded_total:charges.length?money(charges.reduce((n,r)=>n+cents(r.spend),0)):null,complete:false};});
  return {name:item.name,group:item.group,assigned_scope,budget_category:budgetCategory(item,assigned_scope),essential,decision:typeof saved==='string'?saved:state.decision||'Review',billing_frequency,billing_charge:money(charge),scheduled_monthly_amount:money(monthly),baseline_monthly_amount:money(amount),schedule_status:state.billingFrequency?'Saved schedule assumption; renewal terms not verified':item.rr.length===1?'Single observed charge suggests annual; confirm recurrence':'Repeated charges suggest monthly; confirm recurrence',period_total:money(period),recorded_average_per_selected_month:money(Math.round(period/months.length)),latest_charge:item.latest,observed_month_count:item.observedMonths,evidence_month_count:months.length,subscription_candidate:subscription,bill_candidate,monthly:evidenceMonthly,planned_monthly_target:state.target==null?null:money(cents(state.target)),expected_contribution_offset:money(expected),transaction_ids:item.rr.map(r=>r.id),source_refs};
 });
 const summarize=scope=>{
  const selected=items.filter(item=>(scope==='combined'||item.assigned_scope===scope)&&item.essential),total=selected.reduce((n,item)=>n+cents(item.baseline_monthly_amount),0),offset=selected.reduce((n,item)=>n+cents(item.expected_contribution_offset),0),groups=new Map();
  for(const item of selected)groups.set(item.budget_category,(groups.get(item.budget_category)||0)+cents(item.baseline_monthly_amount));
  return {scope,selected_count:selected.length,monthly_total:money(total),expected_contribution_offset:money(offset),monthly_to_cover:money(Math.max(0,total-offset)),categories:[...groups].map(([category,amount])=>({category,monthly_amount:money(amount)})).sort((a,b)=>b.monthly_amount-a.monthly_amount),status:'Saved planning decisions and editable schedule assumptions; expected deposits not matched'};
 };
 const decision_totals=commitmentDecisionLabels.map(decision=>{const selected=items.filter(item=>item.subscription_candidate&&item.decision===decision);return {decision,item_count:selected.length,scheduled_monthly_amount:money(selected.reduce((n,item)=>n+cents(item.scheduled_monthly_amount),0)),observed_period_total:money(selected.reduce((n,item)=>n+cents(item.period_total),0)),status:'Planning estimate; selecting does not cancel a service'};});
 const candidate_totals=['all','bill','subscription'].map(candidate_type=>{const selected=items.filter(item=>candidate_type==='all'||item[candidate_type+'_candidate']);return {candidate_type,item_count:selected.length,scheduled_monthly_amount:money(selected.reduce((n,item)=>n+cents(item.scheduled_monthly_amount),0)),observed_period_total:money(selected.reduce((n,item)=>n+cents(item.period_total),0)),planned_monthly_target:money(selected.reduce((n,item)=>n+cents(item.planned_monthly_target??0),0)),consider_cutting_recorded_average:money(selected.filter(item=>item.decision==='Consider cutting').reduce((n,item)=>n+cents(item.recorded_average_per_selected_month),0))};});
 return {items,months,candidate_totals,scope_totals:['home','work','combined'].map(summarize),subscription_decision_totals:decision_totals,complete:false};
}
