# Finance app prototype

Follow current klappy/kitchens boarding/manifests/cos.md and its linked kitchen guidance. Read boarding/manifest.md, docs/architecture.md, contracts/capabilities.md, contracts/classification-v1.md and docs/release.md. Product version is package.json; every adapter reads it. Never store real ledger data, source documents, tokens, or personal identifiers in this code repo.

This is experimental, not the deployed dashboard. Preserve the current cloud ledger and user decisions. Separate cookbook rail from deployable code (HYGIENE 35). Changes follow PR checks and Git-connected releases (HYGIENE 3, 10a, 19); never run a seat deployment. Release wiring is not yet configured: complete the repository/build binding before a production release.

Classification is suggestion-only. Do not silently promote legacy classifications or unreviewed model output into reviewed examples. Keep source rows immutable, imports idempotent, review history append-only and failed writes atomic. Jev outage must leave current accepted classifications unchanged. Proposals cannot set reimbursement payment states.

Read docs/audit-loop.md, lenses/INDEX.md, qa/MATRIX.md and qa/JOURNEYS.md for capability parity and scoped evaluation. Every changed financial UI element needs a core/MCP mapping; report missing integration honestly. Formal lens reviews require fresh context and their live source prerequisites.
