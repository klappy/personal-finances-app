# Shared finance core — experimental

A working local core and two thin adapters: authenticated loopback HTTP and MCP stdio. Four public capability tools compose documented operations sharing contracts, import validation, revisions and classification review. Read contracts/capabilities.md and contracts/classification-v1.md before use.

Run `npm test`. No dependencies are installed. Requires Node 22+.

For Claude or another local MCP host, configure a stdio server invoking `node /absolute/path/mcp.mjs` with FINANCE_STATE_FILE pointing at a private JSON state file outside this code tree. MCP trust is the launching process, not remote login. Do not expose this transport on the Internet.

For HTTP, set FINANCE_STATE_FILE and FINANCE_HTTP_TOKEN (random, at least 32 characters) out of band, then `npm run serve`. It binds 127.0.0.1:8767. POST /api/capability with Bearer authentication and JSON {name,args}; names are docs, query, project and execute. project/execute carry {operation,args}, with all underlying schemas discoverable through docs. Browser-origin requests are rejected. This is a test adapter, not the production browser authentication flow. Separate processes serialize file access with an exclusive lock. An abandoned lock after a crash requires operator recovery after confirming no process owns it; it never silently steals a lock.

A normalized source row carries source_id, source_line, source_type (Era/Statement/Receipt; Snapshot for a derived migration source), transaction_id, account, merchant, date, amount, spend and classification {group,category,purpose}. Alternate-source matches require the same explicit transaction_id and exact canonical account/date/amount. Partial receipt bundles and posting-date shifts require further reconciliation contracts; this slice refuses to infer those joins.

All new classification proposals require review. The historical fallback uses only accepted review events, not arbitrary existing classifications or model proposals. Jev is a replaceable provider hook in core. The Ma8ic provider uses the existing ask tool at https://ma8ic-8all.klappy.workers.dev/mcp. Set MA8IC_CREDENTIALS_FILE to an existing private 0600 JSON file with clientId/clientSecret and optional endpoint, outside the repository. No credentials are committed. Catalog absence was not proof Jev was unavailable; Ma8ic is the documented service. That optional adapter still needs existing credential wiring; the preferred Cloudflare AI binding has been smoke-tested. No real-model benchmark or automatic acceptance has been claimed.

Not deployed or wired to budget.klappy.dev. A bounded Era posted-feed collector and `era_refresh` import format are now staged on this existing branch; see docs/era-refresh.md. They require an authorized host reader and explicit private account/category policy, preserve prior decisions and baseline months, and activate no schedule. Raw PDF/CSV upload remains pending. Production still needs reviewed migration, deployed parity and Git-connected promotion. The initial dashboard was deployed directly before re-reading the cook-mode rule; future releases must follow kitchen HYGIENE cook 10a. Code changes belong in the app repository; sanitized contract work belongs in the cookbook.

Preferred deployment adapter: cloudflare-jev-provider.mjs accepts env.AI and the versioned contract body, reusing Ma8ic typed questions directly. Generic Cloudflare /ai/run smoke succeeded and returned jev-1.13.0. No separate Access credential is needed for this Worker binding. Live dashboard review integration remains pending.

Agent boarding: AGENTS.md / CLAUDE.md → boarding/manifest.md → live upstream → project charter → architecture/contracts/release → active work evidence. `.mcp.json` is a Claude-compatible local stdio configuration: run from this repository root and set FINANCE_STATE_FILE in the launching environment. It is not a deployed remote MCP connection and contains no credentials. Read docs/architecture.md and docs/release.md before cloud work.

Composition: contracts/composition.md defines evidence → facts → classification → typed flows → projections, shared by HTTP/MCP/UI. query/summarize compose filters and dimensions; no endpoint per screen. Current dashboard query view is a migration bridge, not the intended final API. Snapshot import preserves legacy context without creating accepted review examples. Source completeness, production integration, remaining domain decisions and remote MCP authentication remain pending.

Application repository: https://github.com/klappy/personal-finances-app. Cookbook/learning rail remains separate; no real financial data or state belongs here.

Phase 2 product direction: docs/phase-2-toc-ooda.md — an evidence-grounded household action/learning loop, using the same composable core rather than adding independent screen APIs. Not implemented yet.
