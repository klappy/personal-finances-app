# Finance composition contract — draft implementation direction

Owner instruction, October 6, 2026: consistent data/business-logic layers compose classifications of data types and data flows; no endpoint per UI element. Grounded in kitchen cookbook/lenses/vodka-orthogonal-architecture.md @acc80e1a. The following request pipeline is an application concern, not a replacement definition of L1–L6.

## Components and ownership
- Evidence: immutable source records, source type/line/hash, custody and linkage. Snapshot is a derived migration source, never mislabeled as Era/Statement/Receipt.
- Facts: canonical transaction identity, date, amount, account and original evidence references. Source linking does not add spending.
- Classification: purpose, category/subcategory, financial meaning and review state. Suggestions, historical overlays and accepted human events remain distinguishable.
- Flows: typed measures derived from classified facts, with direction, economic meaning, uncertainty and evidence. Spending charged to a card is a spending commitment; card settlement is a separate cash movement. Neither alone proves change in cash or debt. Reimbursement eligibility/claim/payment and receipt inflows are separate states.
- Projections: pure selection, grouping and aggregation over the declared collections and measures. Publish schema/version/revision/lineage and uncertainty. Missing coverage never becomes certified zero. Composition must conserve values and explicitly separate additive and non-additive measures.
- Service faces: HTTP and MCP authorize, validate envelopes and dispatch the same operations; they do not classify money or calculate a second total.
- UI: render published values, format/layout and request capabilities. Presentation filters produce explicit shared query options; financial decisions use revisioned commands.

These components are bounded L5 application responsibilities served through L2 adapters; same deployment does not merge ownership. Financial records do not grant the app authority to execute economic transactions.

## Patterned service surface
Prefer docs/discovery, query, projection and explicit revisioned command/import operations. Compose by collection, filters, measure and dimensions, not page/widget names. Adding a chart should reuse a projection; adding domain meaning requires a versioned schema/contract, not a UI endpoint. Keep mutation effects discoverable and permission-checked. Existing prototype's nine-tool ceiling is a named vodka gap; consolidate at contract review, not by hiding undocumented operations.

`query(view=dashboard)` is a temporary migration compatibility bridge and must be retired after consumers use shared collection/filter semantics. Do not grow a family of page-name views. A snapshot's retained overrides are provenance-labeled legacy decisions, not certified reviews or a parallel new source of truth. Migration must preserve them while replacing editing with revisioned domain events.

## Composition invariants
Same input revision/options yields the same payload regardless of transport. Source rows → canonical facts is a non-additive join; facts → split allocations conserves the original amount (unsupported/mismatched splits are explicit conflicts); facts → different measure families is not summed as one outflow. Filters are explicit and stable under pagination. Pure projection performs no provider/network/write action. Unknown semantics and unavailable dependency return typed gaps, not a ready cashflow result. Source visibility and actor authorization apply before publication.

## Validation order
Prove pure transforms on valid/missing/conflicting cases, conservation and uncertainty; then actual HTTP/MCP payload parity; then rendered UI conformance and persona usability. Cross-layer audit maps each UI financial element to a composed capability and source chain. An identical helper alone does not prove full application parity.

Review corrections: split allocations conserve every additive measure in integer cents; no value is inherited into multiple children. A missing allocation for a nonzero parent measure is a conflict. Explicit Work travel purpose is applied before scope selection; reimbursement eligibility alone never assigns business purpose. Accepted reviews outrank historical category/purpose overlays and travel inference while preserving history. Parent records with splits reject whole-parent classification proposals; individual allocation review remains an explicit implementation gap.
