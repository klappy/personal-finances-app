# Finance capabilities v0.1 — experimental

## Intended outcome
One finance core supplies the UI and MCP clients. Era is the default feed; immutable statements and receipts verify and backfill it. Source records are evidence, never additional spending. This first executable slice supports normalized imports, queries, proposals, review and export. Direct Era refresh, PDF/CSV extraction, remote MCP OAuth and cloud UI integration are pending adapters, not delivered capabilities.

## Boundaries
The core knows transaction identifiers, source references, classifications and review events. It does not know whether a merchant's purpose is true without reviewed evidence. It is not a bank, payment service, or reimbursement approval engine. Reimbursement eligibility, submission and received payment remain separate from category and Home/Work purpose.

Raw financial data stays outside the code/cookbook repos. Product code, schema, contract and synthetic tests belong in an app repo; rail and learning belong in the private cookbook. Core, HTTP and MCP are modules of the app initially, not independently deployed services. Version authority: package.json.

## Operations and effects
- docs: read contract, limits and tool schemas; no mutation.
- query: filtered canonical transactions; bounded pagination; no mutation.
- summarize: recorded spending by month/category/purpose; no claims of complete months.
- coverage: account/month primary-source and linked-source counts; counts are not completeness proof.
- import_preview: validate normalized source rows and show new lines, exact replays and conflicts; no mutation.
- import_commit: explicit idempotency key; add immutable source rows; require explicit canonical transaction links to match alternate sources. Reject conflicting source identities and canonical amounts/dates; no fuzzy automatic merges. All validation occurs before applying the batch.
- classification_propose: store an unaccepted proposal and supporting reviewed decisions. Unknown/conflicting history requires review. No expense changes or reimbursement inference.
- classification_review: accept, edit or reject a proposal against a ledger revision; preserve original classification and record author/time/evidence. Accepted human reviews become examples; rejected/unreviewed model output never becomes grounding.
- export: complete canonical ledger, sources, proposals, review history and operation receipts; no mutation. No filesystem path is accepted from an MCP client.

Write calls require an authenticated actor from the transport, not an actor supplied in tool arguments. HTTP is loopback-only with an out-of-band bearer token; remote Access/OAuth is a future adapter. MCP stdio trusts the launching local process. Every mutation increments revision and uses optimistic concurrency. Import retries with a reused key return the original receipt only if content is identical; changed content is rejected. Limits and validation errors are shared between HTTP and MCP. Tool annotations describe effects; they are not authorization.

## Proof before expansion
Synthetic tests: repeat import produces no duplicates; a changed key/body is rejected; conflicting lines never overwrite; explicit receipt links do not change totals; stale classifications cannot overwrite current ones; unreviewed/rejected proposals are never training examples; queries and summaries use the same core through HTTP and MCP. Real account/month coverage requires an independently reconciled statement; synthetic tests prove mechanics only.

## Shared spending projection slice
`summarize` with `view: spending`, explicit `months` (1–24 YYYY-MM values) and `scope: home|work|combined` returns period/category/month recorded spending, selected-month recorded averages and period shares. Home includes Household, Personal and Unresolved; Work includes Business. Null monthly values mean no recorded row, not certified zero. Verified min/max/average remain null until account/month coverage is independently certified. Recorded averages are explicitly provisional and cannot be used as a complete budget baseline. Currency accumulation is in integer cents. Period share is not the previous UI's average monthly share and must be labeled accordingly. This projection does not yet implement paid-reimbursement filtering, commitment assignment overrides or inflow/cashflow reconciliation; it must not replace those UI semantics until their contract is implemented. No new MCP tool is added.

## Lossless snapshot bridge and composed flow collections
Existing import_preview/import_commit accept format dashboard_snapshot, at most 5,000 source rows, only into an empty destination. This preserves base records and legacy overrides/context exactly; import source type Snapshot explicitly marks derivative evidence. Replay identity includes the full context; changed decisions under a reused key fail. No accepted reviews are fabricated. Normal normalized batches remain limited to 500. query view dashboard is bounded and temporary; it reconstructs effective rows without overwriting original sources. It is not the final page-shaped API.

query/summarize collection flows composes recorded measures with shared filters and allowed group_by dimensions. Spending commitments, received inflows, settlements, adjustments and unresolved credits have distinct kinds/families. Aggregation must retain kind or family to prevent merging a card purchase and its settlement into one outflow. Mixed deposit payroll/reimbursement allocations remain explicitly estimated; expected contributions are not actual inflows. No verified bank-balance change is claimed. This uses existing operations rather than introducing endpoints per screen. See composition.md.

## Shared decision command
`decision_update` accepts the UI-compatible decision document (transactions, budgets, commitments, notes) and current revision; validates identities, amounts, scope and allocation conservation before applying; records actor/revision and before/after hashes; preserves immutable source records. It does not create accepted review examples or cancel/pay for anything. The current whole-document save is a compatibility command; future field commands compose under the same revision/event rules. Stale saves and invalid documents leave state unchanged.
