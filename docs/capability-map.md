# Dashboard to core capability map — observed October 6, 2026

Observation: cloud dashboard reads /api/data and writes whole override objects to /api/overrides. It does not call prototype operate(). None of the financial UI families below has proven end-to-end core/HTTP/MCP parity. This family-level inventory is a migration starting point, not an exhaustive count or completeness percentage.

| UI family / observed functions | Existing core capability | Missing domain behavior before migration |
|---|---|---|
| Scope/period/reimbursement filters: rows, overviewScopeRows, householdRows, spending | query | Period sets; home/work assignment semantics; excluded sources; reimbursement eligibility vs submitted vs paid; matched portions |
| Overview and hero cards: render, renderPageHeroes, sum | summarize | Separate payroll, reimbursements received, agreed vs matched contributions; gross vs filtered spending; gap meaning and monthly averages |
| Stacked chart/category breakdown: averageShare, drawChart, renderDetail, merchantTable | summarize/query | Monthly category and merchant projections, eligible-month denominator and average share; legend hiding is presentation state |
| Income and funding: render, givingTrail | none for funding reconciliation | External inflow classification, transfer pairing, contribution attribution, payroll/reimbursement splits and evidence |
| Bills/subscriptions/baseline: billName, renderCommitments, planningItems, billingControl, renderPlanning | none for planning decisions | Recurrence evidence and editable frequency, normalized monthly charge, home/work move, selection/decision totals and agreed contribution offsets |
| Budget targets/notes: renderBudget | none | Revisioned targets, undecided state, scope-specific plan and notes; replace hardcoded three-month division |
| Transactions/editor: renderTransactions, edit | query/classification_review | Current editor saves overrides directly; migrate explicit reviewed human decision events without falsely labeling legacy decisions reviewed |
| Source coverage: sourceCoverageStats, renderAccountSourceMonths, renderSourceCoverage | coverage | Account/month original-feed vs statement/receipt vs unique canonical counts, reconciliation controls and evidence coverage; counts do not prove completeness |
| Credit card snapshot page | none | Protected runtime account snapshots, as-of/freshness, totals and account exclusions; remove embedded financial snapshots from HTML |
| Load/save/export | export/import_commit and revision checks | Production D1 atomic store, Access actor mapping, legacy snapshot adapter, versioned planning mutation contracts, export custody |

Presentation-only: openTab, sidebar, colors, formatted labels and chart visibility can stay client-side. Derived financial values and decision semantics need declared domain owners and shared projections. Do not add an MCP tool per UI widget; organize domain capabilities behind the agreed service surface and resolve the existing nine-tool ceiling finding before expanding tools.

First implementation slice: shared filter/projection contract with synthetic fixtures; read-only overview projection exposed through existing summarize dispatch, then migrate UI consumption. Preserve current cloud ledger and overrides; never replace it with stale local data. Requirements to settle in the contract: hidden paid expense treatment must explicitly distinguish spending view from received reimbursement inflow; future monthly completeness must not treat a missing account month as zero.

Unperformed: deployed UI migration, exhaustive element-level audit, actual financial totals parity, remote MCP auth, production core wiring. Existing mechanics tests are independent evidence only for their tested cases.
