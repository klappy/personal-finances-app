# Shared-core and user-journey audit loop

Owner-directed project hygiene, October 6, 2026. This is a plan and registration, not a passed lens run or a scheduled automation.

## Triggers and scope
Every build: bounded P0 smoke. Each feature/fix: changed journey, neighbours, bug repro and smoke. Before releases, auth/schema/dependency changes, and after red smoke: full registered regression. Each monthly ingestion/reconciliation close: account/month evidence checks and UI/HTTP/MCP parity at one ledger revision. Calendar automation is not configured.

Use the existing test runner, synthetic seed and receipt files first; no new evaluation service. Smoke cap 5 minutes, targeted 20, full 45; no paid model calls by default. Stop at the cap and report untested work. A formal fresh-context lens run uses the upstream skill and its receipts; these project checks do not substitute for that run.

## One truth across every layer
Inventory every visible number, chart series, filter, category assignment, subscription decision, budget amount, reimbursement status, source count, import/export and save action. For each map: UI element → capability/operation → core function → evidence IDs and ledger revision → HTTP/MCP exposure → parity test. Presentation-only state (open sidebar, active tab, formatting) may stay client-side; financial rules and derived numbers belong in the core.

Compare the same fixture, actor permissions, scope, period, reimbursement toggle and revision through core, HTTP, MCP and rendered UI. Read operations must agree after documented currency rounding. Mutations must produce the same validated event and subsequent read result. Verify pagination, retries, stale writes and source links. Fail on an unmapped financial element, an adapter-only financial rule, a fabricated zero for a missing month or disagreement in financial meaning. Counts alone never prove statement completeness.

Current baseline: live dashboard uses separate client calculations and a D1 snapshot; prototype core is not connected to it. UI parity is NOT established. Record migration gaps instead of passing the target architecture by intent. Coverage denominator is all inventoried financial elements; list unknown/uninventoried surfaces, never report 100% while these remain.

## Lenses at every layer
Apply registered perspectives to evidence ingestion, domain calculations, service adapters, agent tools, UI and release operations. Keep their responsibilities distinct: product assesses the goal and journey; design assesses rendered surfaces against a design contract; QA exercises behavior and bad paths; vodka checks declared boundaries, bindings and tool surface. Terry’s manifest and charter are resolved; the cookbook holds a draft governance-arbitration lens, not an activated rule or verdict. A nonvisual layer has design marked not applicable with a reason, not a fake screenshot pass.

Use qa/MATRIX.md and qa/JOURNEYS.md for agentic user simulation. Persona journeys are QA exercises; product-lens explicitly does not run persona waves. Simulated findings are custody=run, not the spouse’s feedback or an owner ruling. Fresh-context reviewers do not grade changes they authored. No tests on production or real financial data, no bank actions or subscription cancellation.

## Evidence and decisions
A receipt pins build SHA, data revision, fixture hash, lens URI/SHA/version/status, persona/journey, filters, expected/observed result, screenshot or trace for UI failures, repro, severity/priority, elapsed time/cost and untested list. Formal lens receipts follow upstream LENSES.tsv and disclosure rules. Keep sensitive artifacts outside Git.

Release: no-go for failing P0 or severity-1 failures; hold for missing evidence or incomplete required checks; go only after every P0 passes and known issues are explicitly accepted under the applicable release contract. Preserve distinctions between automated mechanics, simulated usability and real household feedback. Feed failures back into the smallest regression case and the next OODA loop, not another layer of infrastructure.

## Planning is a first-class use
Before implementation, use product for the user/journey, design for the design contract, QA planning for persona scope and evidence needed, vodka for boundaries, and Terry for current governing decisions and provenance. Evaluate the resulting implementation against those same recorded expectations. Preserve each upstream lens’s phase/gates: planning support does not silently rewrite evaluating-only bodies or count as passed validation.

## Full lifecycle — owner clarification
Every lens perspective informs exploration, planning, execution and validation at every affected layer. This is the project’s lifecycle requirement; formal imported lens runs still obey their declared phase/gates. If a formal body cannot support a mode, record that gap and propose a versioned extension instead of narrowing the owner’s scope or pretending the body already changed.

| Mode | Product | Design | QA | Vodka | Terry |
|---|---|---|---|---|---|
| Exploration | Understand user goals and uncertain journeys | Explore usable flows and constraints | Identify failure risks and representative users | Explore responsibility boundaries | Find governing decisions, scope, unknowns and tensions |
| Planning | Choose outcome and journey | Establish contract and intended screens | Choose fixtures, journeys, bad paths and evidence | Specify boundaries, bindings and capabilities | Establish current authority and decision provenance |
| Execution | Check changes against the intended outcome | Follow the contract and observe rendered drift | Exercise changed behavior and maintain regressions | Check implementation against declared boundaries | Check ongoing choices against authority; record amendments and drift |
| Validation | Walk the resulting user journey | Compare rendered surfaces to the contract | Independently prove behavior, bad paths and regressions | Verify actual surface and bindings | Trace claims to current obligations and observed evidence |

No lens becomes the implementing actor or self-validates its own work. Exploration findings are hypotheses; planning findings are commitments only within authority; execution findings are observations; validation findings need independent evidence. Re-run the affected perspectives when new evidence changes scope, rather than automatically running five full reviews on every edit.
