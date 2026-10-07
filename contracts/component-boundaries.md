# Finance component boundaries — v1, October 7, 2026

This is the project owner's specification, not a lens verdict. The request pipeline composes L5 domain responsibilities through replaceable L2 faces. A single Worker process hosts these components without combining their authority. This app stores financial evidence; it is not a generic canon-serving infrastructure service.

## What This Server Knows

- **Core, L5:** canonical facts and immutable source links; accepted review and legacy decision provenance; typed flows; pure projections; revisioned import/curation commands; uncertainty and validation. Entry: core.mjs. Operation schema/effect/route ownership: capability-contract.mjs. Classification schema/question/result interpretation: classification-contract.mjs. Snapshot/curation/runtime evidence: snapshot.mjs, decisions.mjs and runtime-evidence.mjs. Domain transforms: dashboard-domain.mjs, flows.mjs, projection.mjs, flow-projection.mjs, commitment-projection.mjs, evidence-projection.mjs, giving-evidence.mjs, account-projection.mjs and record-query.mjs.
- **Protocol faces, L2:** declared envelope schemas, protocol framing, actor identity supplied by the transport, request dispatch and error serialization. HTTP: http.mjs. MCP: mcp.mjs. Cloud delivery: worker.mjs. Verified Access JWT identity mapping: auth.mjs. Tool registration: tools.mjs. Face code delegates financial meaning to the core.
- **Persistence, L2:** state serialization, revision compare-and-swap, local locking/atomic replacement and D1 row storage. store.mjs and d1-store.mjs implement storage for the L5-owned ledger. D1 DB holds app_state ledger/evidence/decisions; it is authoritative application data, not an ephemeral canon cache. Neither persistence adapter decides spending classification.
- **Provider adapter, L2:** Cloudflare AI or Ma8ic request/response shape, errors and model version. cloudflare-jev-provider.mjs and ma8ic-provider.mjs. Core owns the classification question, proposal validation and human review workflow.
- **Client, L5:** layout, accessibility, local navigation/preferences, financial value formatting, explicit capability requests, draft controls and serialized decision submission. frontend/ owns no alternative financial aggregation oracle. Remaining compatibility display/editor dependencies are enumerated in docs/capability-map.md and must be proven or retired.
- **Deployment assets, L5:** generic application branding and its shell. ASSETS binds dist, contains no ledger, and is gated by the Worker before delivery. Network-only service worker has no offline financial cache.

## What This Server Does NOT Know

- Whether source coverage proves a complete month unless independently reconciled line/balance controls support that claim.
- Whether an expense is household/business or reimbursed merely from a merchant, model score, claim submission or incoming amount.
- Real-time account balances, card APR/minimum payment or reimbursement payment matching absent current evidence.
- A financial institution's source truth beyond imported records; live Era extraction and arbitrary PDF extraction remain pending adapters.
- Governance law or the captain's opinion. Canon/kitchen/cookbook are external governing sources; code does not create or adjudicate them.
- Another component's private implementation: faces/persistence/providers do not own finance policy, and clients do not reconstruct totals.

## What This Server Is NOT

- A bank, payment executor, subscription cancellation service or economic settlement authority.
- An autonomous classifier that accepts its own proposals or upgrades legacy labels into reviewed training evidence.
- A second source of truth for current cloud decisions; migrations preserve and extend the existing ledger with conflicts rejected.
- A widget endpoint factory. New displays compose collections, dimensions, filters and declared measures through existing capabilities.
- A generic canon server or governance arbitration engine. Domain rules are explicitly L5 application contracts.
- A public ledger or offline financial data cache. Authorization precedes data and asset delivery.

## Four tools and their reason

The actual tools/list registration is tools.mjs: docs, query, project, execute. Query exposes bounded record/flow pages as well as complete unpaginated ledger/snapshot exports; project separates pure derived reads/previews from explicit writes/provider interpretation; execute owns authorized commands; docs discovers the running version's schemas and effects. Some enforced validator limits are not yet advertised, including normalized import/snapshot sizes, pagination bounds and runtime evidence payload limits; documentation completeness remains an open gate. The fourth tool makes pure projection independently discoverable and enforceably read-only rather than mixing it with interpretation/write effects in execute. Operations remain openly documented; reducing tool count does not conceal them.

Docs is generated from running executable schemas. It currently does not fetch external canon documentation or expose telemetry; these are named differences from the proposed house default trio, not claims of formal lens compliance. No remote OAuth client credential flow is implemented yet. Local stdio and loopback bearer paths exist; deployed MCP requires the same verified two-person Access identity.

## Growth and removal

The giving-evidence.mjs module is an L5 historical-evidence projection composed by the existing evidence collection. It owns receipt-date selection, canonical scope attribution, duplicate/conflict handling and uncertainty. It adds no tool, endpoint, bank match or spending fact. Removing it leaves canonical spending unchanged but removes the giving evidence explanation from all clients. The client formats its result; ledger links establish scope and are not receipt-extraction custody. Legacy context custody remains unknown.

The classification-contract.mjs module moves existing finance vocabulary, question construction and score interpretation from L2 adapters into their declared L5 owner. It adds no capability or economic authority: the Is-NOT autonomous-classifier boundary remains review-only, with unchanged facts until human acceptance. The preceding documentation/UI unit added no tool, binding or module to cross an Is-NOT boundary. It writes missing boundary/registration evidence and corrects client technical bugs. Removing the core breaks authoritative queries/projections/commands; removing a face breaks its protocol consumers but an equivalent adapter may replace it. Removing the UI leaves API/MCP operation available but breaks household browsing/curation. Removing storage loses durable decisions and evidence. These are dependency claims; removal trials remain unperformed.
