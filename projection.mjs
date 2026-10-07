import {scopeRows} from './dashboard-domain.mjs';
// Shared spending projection. Inflow reconciliation and coverage certification are separate capabilities.
const cents = value => Math.round(value * 100);
const dollars = value => value / 100;
export function spendingProjection(transactions, args, revision) {
  const scope = args.scope || 'combined';
  if (!['home', 'work', 'combined'].includes(scope)) throw Error('Invalid scope');
  if (!Array.isArray(args.months) || !args.months.length || args.months.length > 24 || args.months.some(m => typeof m !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(m))) throw Error('Projection requires 1–24 valid months');
  const months = [...new Set(args.months)].sort();
  const rows = scopeRows(transactions.map(r=>({...r,...r.classification})),scope).filter(r => months.includes(r.date.slice(0, 7)) && (!args.account || r.account === args.account) && (!args.purpose || r.classification.purpose === args.purpose));
  const groups = new Map(), monthly = new Map(months.map(m => [m, {count: 0, amount: 0}]));
  for (const r of rows) {
    if (!Number.isFinite(r.spend) || r.spend < 0) throw Error('Invalid canonical spending');
    const month = r.date.slice(0, 7), amount = cents(r.spend), c = r.classification;
    const cell = monthly.get(month); cell.count++; cell.amount += amount;
    const key = JSON.stringify([c.group, c.category]);
    if (!groups.has(key)) groups.set(key, {group: c.group, category: c.category, amount: 0, months: new Map(), count: 0});
    const group = groups.get(key); group.amount += amount; group.count++; group.months.set(month, (group.months.get(month) || 0) + amount);
  }
  const total = [...monthly.values()].reduce((n, cell) => n + cell.amount, 0);
  return {
    revision, scope, months, record_count: rows.length, period_total: dollars(total),
    recorded_average_per_selected_month: dollars(Math.round(total / months.length)),
    complete: false, statistics_status: 'provisional recorded data; account/month completeness not certified',
    monthly: months.map(month => { const cell = monthly.get(month); return {month, recorded_total: cell.count ? dollars(cell.amount) : null, record_count: cell.count, complete: false}; }),
    categories: [...groups.values()].sort((a, b) => b.amount - a.amount || JSON.stringify([a.group,a.category]).localeCompare(JSON.stringify([b.group,b.category]))).map(g => ({
      group: g.group, category: g.category, period_total: dollars(g.amount), record_count: g.count,
      recorded_average_per_selected_month: dollars(Math.round(g.amount / months.length)),
      verified_min_month: null, verified_max_month: null, verified_average_month: null,
      period_share_percent: total ? Math.round(g.amount / total * 10000) / 100 : null,
      monthly: months.map(month => ({month, recorded_total: g.months.has(month) ? dollars(g.months.get(month)) : null, complete: false}))
    }))
  };
}
