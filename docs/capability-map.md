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

## Local migration evidence — October 7, 2026
The table above records the original baseline. The following reflects the current development frontend, not deployed production. Every operation uses the same four-tool dispatcher; there are no page-specific HTTP endpoints.

| Surface | Shared operation / projection | Evidence and remaining gap |
|---|---|---|
| Overview, category totals, cash hero | project/summarize/flows → flowProjection | Core-owned typed amounts, averages and funding comparison; provisional expected funding and allocations retain uncertainty |
| Chart and category/merchant drilldowns | flows series and generic rollups | Core monthly totals/shares, source IDs and canonical parent lineage; rendered full-scope parity still pending |
| Cash movement table | flows rollups by kind/payment_channel | Purchases and settlement remain separate; informational funding excluded; local Home rendering checked |
| Bills, subscriptions, baseline | project/summarize/commitments → commitmentProjection | Core schedule assumptions, selections, targets and decision totals; recurrence and completeness not certified |
| Budget comparison | flows budget_comparison | Saved targets, nullable averages and allocation-aware payroll comparison; global targets across scopes explicitly retained |
| Contribution plan / funding summary | flows contribution_plan, measures and purpose rollups | Expected arrangement separate from classified receipts; no payment-matching certification |
| Coverage table and heroes | project/summarize/evidence → evidenceProjection | Observed counts, receipt links, nullable original inventory and source references; line/balance reconciliation unavailable |
| Transaction search/count/spending heroes | query/records → recordQuery | Shared filters, bounded pagination, full-match summaries and source references; local search/multi-page read verified, race/mutation journeys pending |
| Giving trail | project/summarize/evidence → givingEvidence | Core receipt-date selection and scope attribution; exact duplicates/conflicts and unresolved evidence explicit; source custody of legacy context unknown, bank matching not certified |
| Imported coverage notes | Protected snapshot context | Retained historical narrative; field-level provenance audit still pending |
| Credit-card snapshots | project/summarize/accounts → accountProjection | Typed runtime import and latest dated snapshot/source projection; local core/HTTP and rendering verified, production preservation/release still pending |
| Save/edit/export | decision_update and protected snapshot adapters | Revisioned append-only decision events; real browser failed-write/stale-edit journeys and cloud migration still pending |

Existing 27-case private-data checks compare flows and commitments across core/HTTP/MCP at one local revision without changing state. They do not prove coverage, rendered UI, current production data preservation or all action parity. Synthetic evidence/target tests add narrow MCP parity proofs. No 100% UI parity claim is supported. Remaining release gates include protected metadata migration, full runtime smoke/decision preservation, PWA assets, Git-connected dev/prod builds and authorized remote MCP configuration.

## Verified candidate v0.5.25
Exact candidate a9a2d90a7b51fac52e962dd355e4e04a63c911a3 passed CI/Bugbot and Git-connected dev build9a712599-e5d7-4c1e-8404-02a9b8b4cd41. Private96-case real-data read comparisons across core/HTTP/stdio MCP passed at unchanged local revision2. A separate synthetic protocol run exercised all10 operations, including imports, idempotent replay, decision updates, proposal acceptance/rejection and stale-write atomicity; financial/evidence results agreed and immutable source rows stayed unchanged. Rendered synthetic giving and dirty-reload journeys passed with19 fixture records/revision1/zero writes. These are scoped local proofs; remote OAuth, authenticated deployed parity, exhaustive element audit and phone/PWA validation remain pending. Cloud dev/prod ledger values remained identical after dev release:857 records, revision1. Production remains the reference implementation.

## Staged v0.5.27 source observations

Existing import_preview/import_commit accept source_observations in the local working tree; query collection observations returns immutable original fields, declared custody, non-additive amounts, candidate availability and authenticated import events. Core owns validation/planning/query in source-observations.mjs. Source coverage now has a locally staged original-document inspector mapped to query collection observations. Its totals, custody and candidate availability come from the core; original fields render as text. No accepted relationship review, deployed inspector or original-document completeness claim exists. Synthetic actual HTTP import/stdio query and replay verification passes; darkphone/laptop inspector QA passes, including period/all-date and unknown cases; deployed OAuth client/inspector verification remains pending. Local real-data102case transport parity includes6observation queries at revision3 without read-time mutation.

## Staged v0.5.29 record source descriptions

Transaction source cells and editor source reads consume query/records source_evidence from record-query.mjs. Legacy source/account strings no longer establish a source type or bank match. The descriptor separates derivative and declared custody, conflicts, unknowns, parent locators and unverified reported origin. Editor reads are revision/request guarded and invalidated on confirmed save/applied reload. See contracts/record-source-evidence.md. Scoped review passes; protocol/rendered verification and Git-connected release remain pending.

## Local context-custody follow-up

Historical context fields now compose `query` / `snapshot` → contextEvidence. The status/as-of banner, reference notes and imported coverage table format the same descriptors exposed to HTTP and MCP. The month headings come from core snapshot month metadata. Historical notes are unfiltered context, independent of Home/Work/period; matching runtime references require an exact path and value, while original custody remains uncertified. Legacy transaction snapshot references cannot establish context-field custody. After a save advances the loaded revision, all context surfaces mark prior DTOs stale until reloaded. `coreMoneyCard` formats core metrics only; missing averages remain unavailable and no numeric fallback divides amounts in the browser.

Local103-case core/authenticated HTTP/stdio comparisons include snapshot attachment at unchanged private revision3. This does not prove remote OAuth, deployed UI, source completeness or a whole-app parity percentage. Rendered validation and release gates remain pending for this unit.

## Local decision-preparation unit

Classification editor choices → project/decision_preview → L5 prepareDecisions → optional visible dependent suggestions → execute/decision_update. Explicit Household purpose and category stay explicit across UI/HTTP/MCP. The visible purpose is pinned explicitly on Save; other unchanged legacy fields are omitted, not normalized. Core effective purpose/category/scope states come from the same row pipeline used by queries. The editor guards pending previews and save acknowledgements against changed identities, revisions, fields and sibling drafts. Four tools now compose eleven operations; prior ten-operation receipts retain their historical scope and do not cover this new operation. Rendered/release gates remain pending.
