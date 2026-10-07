# Finance project boarding manifest

Read order, every new session:

1. Fetch current `klappy/kitchens boarding/manifests/cos.md` from main and follow its linked sources, mode packs and refresh rules. Report unavailable sources; do not reconstruct missing rules. The kitchen is upstream, not copied here.
2. Read `AGENTS.md`, `README.md` and `package.json`. The version authority is package.json.
3. Read the project charter in `klappy/personal-finances-cookbook CHARTER.md` from the active branch/PR until merged, then main. Current draft: finance-capability-contract / PR 1. Do not pretend the main branch already carries the draft.
4. Read `docs/architecture.md`, `contracts/capabilities.md`, `contracts/classification-v1.md` and `docs/release.md`. Read `docs/pwa.md` only for phone/UI work.
5. Read `RECEIPT.md`, the active cookbook work unit and its matching journal. Re-observe actual local/remote state before trusting claims. The cookbook owns the rail; this code repo does not.
6. Inspect the affected code and tests; run `npm test` before claiming the core works. Fetch provider docs at use; Jev uses Cloudflare's generic /ai/run or Worker AI binding, not catalog availability as a gate.

Mode: exploration/planning is read-only unless the owner asks for a saved contract; implementation follows the updated contract, scoped authority and release checks. Define the next unit before code. Private financial files remain outside the app and cookbook repositories.

Refresh: re-read live upstream changes and affected contracts on mode changes; plans older than an hour require observation of current state. Saved user decisions are evidence, not configuration to overwrite. Do not reopen settled exclusions or spending classifications without contrary evidence.

Handoff floor: commit code and its docs together, record tests/observations and gaps, link the app PR from the cookbook unit. A local test is not a release, a synthetic inference is not an accuracy benchmark, and a snapshot is not automatic Era refresh.

Read docs/audit-loop.md, lenses/INDEX.md, qa/MATRIX.md and qa/JOURNEYS.md for capability parity and scoped evaluation. Every changed financial UI element needs a core/MCP mapping; report missing integration honestly. Formal lens reviews require fresh context and their live source prerequisites.
