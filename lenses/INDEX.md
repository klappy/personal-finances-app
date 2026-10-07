# Finance lens registration — draft

Sources fetched October 6, 2026. Resolve current main at run time and pin the actual SHA; import bodies, never copy or change house rules here. This registration is not a formal lens run or owner acknowledgment.

| Lens | Import | Observed SHA | Status |
|---|---|---|---|
| product-lens@2 | https://github.com/klappy/kitchen/blob/main/cookbook/lenses/product-lens.md | bc6e51814b7789986781b7a2be80b674ad9c4c07 | provisional upstream |
| design-lens@1 | https://github.com/klappy/kitchen/blob/main/cookbook/lenses/design-lens.md | e8ba65f5696da28fd52928209e7a7d2e702abbe7 | provisional upstream; project design contract pending |
| qa-lens@1 | https://github.com/klappy/kitchen/blob/main/cookbook/lenses/qa-lens.md | d1d0293bf25b9d15b2ee3f4226b71f46613b426b | upstream owner ack pending |
| vodka-lens@1 | https://github.com/klappy/kitchen/blob/main/cookbook/lenses/vodka-lens.md | 037a49c7089d05e7a1a2b46a69bc7a6c7df2aec8 | provisional upstream; project answer key draft below |
| terry-lens@0.1.0 | https://github.com/klappy/kitchen/blob/promote-terry-lifecycle-lenses/cookbook/lenses/terry-lens.md | draft; kitchen PR247 | source remit resolved via Terry manifest and charter; body/contract not activated |

Project chair: primary user managing household money; secondary partner understanding commitments; agent client curating evidence. Journey definitions: qa/JOURNEYS.md; persona scope: qa/MATRIX.md. Targets: affected layer and changed journey, not an unlimited sweep.

Formal-run prerequisites still owed: product evidence needs, design contract/tokens/mock pairs, independent review of the draft vodka AK-1…12 answer key/spec enumerations and current canonical rule evidence; QA seeded build/reset and live build identity. No lens YES until its required evidence is fetched and read. The current MCP exposes four tools and ten documented operations; vodka’s tool-ceiling check must evaluate the actual tools/list separately from operation breadth, including the written fourth-tool reason. Do not add wrappers merely to hide the count.

Upstream skill: https://github.com/klappy/kitchens/blob/main/skills/lens/SKILL.md @2b74340441a67b9bf2413d0551ed36d07a951134. Fresh-context lens findings carry custody=run and grounds, never a person’s endorsement. QA persona tests and product lens reviews are separate runs.

Planning correction: these perspectives apply before implementation as well as during evaluation. See docs/audit-loop.md. Terry’s owner-requested draft lives on the cookbook side, not as house law in app code.

Owner scope: all five perspectives across exploration, planning, execution and validation. The local lifecycle matrix is in docs/audit-loop.md; canonical promotion is kitchen PR247; unavailable formal mode coverage is an explicit registration gap, not grounds to omit the perspective.

## Vodka answer key — project specification, October 7, 2026

This registration supplies missing evaluation inputs; it is not a passing lens receipt. Current implementation reference: app PR1 commit a6bdff2c79218adaee6086a8eddacdd79b0689e2. New boundary spec is a local draft until its reviewed publication commit is recorded. Fresh review must resolve/pin that commit rather than use this draft as a deployed claim.

| Field | Project answer |
|---|---|
| AK-1 | Core/domain: core.mjs, classification-contract.mjs, snapshot.mjs, decisions.mjs, runtime-evidence.mjs and domain/projection modules listed in contracts/component-boundaries.md; protocol faces: http.mjs, mcp.mjs, worker.mjs, tools.mjs, auth.mjs; persistence: store.mjs, d1-store.mjs; providers: cloudflare-jev-provider.mjs, ma8ic-provider.mjs; client: frontend/; governance context: AGENTS.md, CLAUDE.md, boarding/manifest.md, contracts/, docs/, lenses/ and qa/. Resolve each Git blob at the evaluated build commit. |
| AK-2 | Every listed construct is inside the evaluation remit. Application-domain ownership is L5; generic adapters do not gain domain ownership by sharing its process. |
| AK-3 | contracts/component-boundaries.md v1, October 7, 2026: three enumerated boundary sections and explicit growth/removal statements. Fetch its current evaluated Git blob SHA. |
| AK-4 | Core/domain/client/project documents L5; protocol/persistence/provider adapter components L2. No L4 agent or L6 settlement component is implemented. |
| AK-5 | tools.mjs is the registration fallback until protected dev answers tools/list. Four tools docs/query/project/execute. Fourth-tool reason and documentation limitations in boundary spec. No live remote-client authentication proof yet. |
| AK-6 | wrangler.jsonc: DB owns canonical app_state ledger/evidence/decisions under core revision/CAS; separate dev/prod databases. ASSETS is generic build output gated by Worker auth. Local file store is the same L5 state shape. No KV/R2/DO bindings or financial offline cache. |
| AK-7 | Governing authority: current klappy/kitchen and klappy/kitchens; product charter/rail: klappy/personal-finances-cookbook. Application executable contracts: contracts/. No autonomous role/system prompt template. |
| AK-8 | Financial vocabulary: Household, Personal, Business, Travel, AI, payroll, reimbursement, mortgage, giving, wife, Tata, card settlement. Domain branching is owned by declared L5 transforms; inspect L2 faces/adapters for leaked financial meaning. URI/protocol parsing is structure. |
| AK-9 | One application ledger only, with dev isolation; no generic KB-serving portability claim. Governing repositories are references, not served KBs. |
| AK-10 | Maintainer Christopher Klapp; one Worker app deployment per isolated environment; docs/release.md defines Git-connected release. First production migration is not complete. |
| AK-11 | Core/persistence are required for authoritative data/actions; replaceable protocol adapters enable their clients; UI enables the household journey. Boundary spec records dependency claims; removal trial unperformed. |
| AK-12 | docs/release.md records technical corrections and evidence/gaps; cookbook rail owns governing decisions. No financial incident log has yet been established; do not claim one exists. |
