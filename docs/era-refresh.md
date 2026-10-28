# Bounded Era refresh — implementation contract

Owner-directed secondary-priority capability, October 28, 2026. This extends app PR 1 (`shared-finance-core`) and cookbook PR 1 (`finance-capability-contract`); it neither restarts the predecessor nor adopts proposed cookbook PR 2. No schedule or production release is claimed.

The current constraint is the absence of an Era ingestion adapter. The app already owns immutable sources, normalized imports, revision/CAS writes and shared UI/HTTP/MCP semantics. Reuse those services; no new endpoint, credential or authentication grant.

## Outcome and scope

A caller with the existing authorized Era connection supplies a private, explicit live-account allowlist and category-to-economic-kind mapping. The collector reads posted transactions for a declared window of at most 35 days, at most 20 accounts, 50 pages and 500 records in one run. It verifies every page, account, date, count and terminal flag before any write. No hidden/simulation account, child account, newly discovered account or unlisted category is included by default. Account discovery never changes the allowlist. History restrictions, warnings, pagination drift, pending rows, invalid currency/signs and changed facts stop the batch.

`era_refresh` extends existing import_preview/import_commit. Immutable Era transaction IDs and original fields are preserved. Existing IDs may gain evidence only when account/date/amount agree; their financial measures, manual classifications, budgets, baseline months, reviews, reservations and reimbursement states stay unchanged. A private `new_records_from` boundary rejects unmatched historical records so statement-backed rows cannot be duplicated by a date/amount guess. It must be chosen from the actual reconciliation state before activation.

New rows require an explicitly configured economic kind for the exact Era category: purchase, card_payment, internal_transfer, unclassified_credit or refund. Purchases alone add spending; only bank-side card-payment outflows add settlement. Incoming funds are never inferred to be payroll, spouse funding or a paid reimbursement. New classifications remain Needs review/Unresolved. Unknown kinds and categories stop the complete batch rather than silently treating cash movement as spending or zero. This is a bounded conservative mapper, not automatic categorization or complete reconciliation.

The source identity pins the account policy and mapper version; source line is the provider transaction ID. Source observations are immutable across runs. Each successful run records actor, retrieval time, window, count and incomplete reconciliation status in an import receipt. Same-key replay is unchanged; changed content under the same key is rejected. Preview, validation, connector failure, stale revision and losing CAS preserve the previous-good persisted snapshot. A caller may retry the exact staged payload/key after an uncertain response; it must not overwrite or reseed a ledger.

Snapshot queries expose feed freshness separately from historical snapshot `as_of`, and available transaction months separately from unchanged baseline `months`. The period control may select newly imported months. Baseline averages and saved targets are not widened automatically. The app continues to label recorded data as unreconciled and account balance dates as independently stale. Failure logs must be sanitized; never advance last-success time after a failed read or write.

## Schedule and release gates

Proposed first activation: once daily, one 35-day posted window, exact pre-recorded account policy, hard caps above, one staged batch, one commit and at most one same-payload retry after an uncertain response. The exact daily time, target environment, allowlist, `new_records_from` boundaries, category mappings and run budget must be recorded in the private cookbook before activation. No Worker cron, automation or bank refresh is created by this change. The driver accepts an injected connector reader and existing capability caller; no unattended Era credential is invented.

Demonstrate a complete bounded read, preview, commit, replay, changed-source rejection, incomplete-page rejection, failed connector/write recovery, stale revision/CAS safety and preserved decisions with synthetic data. A private real-source preview is separate evidence; it does not authorize a production import. Release only via the existing reviewed branch, required checks and Git-connected development build. Production remains the reference dashboard and requires its own reviewed migration/release gate. No direct Worker upload or production database replacement.

## Alternatives and reversibility

| 6B | Decision |
|---|---|
| Borrow | Existing Era connector, import services, revision/CAS stores and snapshot UI. |
| Bend | Add one bounded Era import format and an injected collector, sharing current services. |
| Break | Do not reuse the failed personal-cashflow implementation or overwrite cloud snapshots. |
| Beget | No new service, fifth tool, credentials, bank-category automation or scheduler infrastructure. |
| Bide | Production activation and scheduling wait for actual end-to-end proof and recorded scope. |
| Build | Only the missing normalizer, collector, freshness projection and regressions. |

Reversibility: code stays on existing PR 1; no deployment or schedule is activated. Imports retain immutable evidence and previous release identity; failures make no state change. Accepted data is append-only and is not removed by reverting code.

Prior decisions checked: cookbook PR 1 CHARTER.md and contracts/capabilities.md; app AGENTS.md, docs/release.md and contracts/source-observations.md; kitchen journal/cookbook-pr-resolution.tsv → existing ingestion/release gaps and retained design decision found. Kitchen search for Era refresh returned no matching implementation unit. Implementation budget: 25 minutes, 30 tool turns, 20K new tokens; stop at a named release/access gate with code and proof preserved.

Planning perspectives: product requires fresh explainable records; design requires distinct freshness and baseline labels; QA targets replay/conflicts/pagination/failure; vodka retains L5 economic meaning and four services; Terry retains auth, reconciliation and release boundaries. These are planning considerations, not fresh-context formal lens verdicts. Formal review prerequisites and design adoption remain separately recorded.

Release tooling follow-up: the October 28 audit identifies the existing Wrangler 4.148.0 dependency chain as affected by an Undici high-severity advisory. Apply its compatible Wrangler 4.154.0 fix in this same scoped change and re-run tests, build/privacy, audit and a non-uploading development configuration dry-run. This changes no authentication, bindings, build trigger, schedule or production state.
