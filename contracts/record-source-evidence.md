# Record source evidence — v1, staged locally

Existing query collection records publishes source_evidence per row. record-query.mjs owns this pure L5 descriptor; core supplies immutable source references and revision. UI formats the descriptor. No new endpoint, tool, match acceptance or financial measure is introduced. The docs capability publishes record_source_contract and record_source_schema for this descriptor.

Reference identity is source_id/source_line. Exact declarations collapse to one locator; conflicting types for that identity remain explicit. Recognized types are Era, Statement, Receipt and Snapshot. Unknown or invalid declarations never default to Era. Locator count is not independent corroboration or document count.

Fields: canonical_record_id, reference_scope (canonical_record/canonical_parent), references, reference_count, invalid_reference_count, declared_source_types, unknown_source_types, has_derivative_snapshot, custody_status, reported_origin, display_label, bank_match_verified, source_complete_verified and reconciliation_status. Each reference retains source_id/source_line/source_types/status. Split children use canonical_parent references; independently sourced allocation evidence is not established.

custody_status is missing, derivative_only, declared_original_only, mixed or unresolved_declarations. Declared original source types mean importer declarations, not independently verified bytes. Snapshot is derivative evidence. reported_origin preserves a legacy string separately and is explicitly unverified. bank_match_verified and source_complete_verified remain false until a future reviewed reconciliation contract exists. A Receipt reference or legacy “bank debit” label is not an accepted bank match.

The transaction source cell consumes the descriptor. The editor queries records with its selected ID, combined scope, the record's month and gross visibility. Request/response must match loaded revision and current editor identity. Loading, failure and revision changes remain unavailable without a legacy-label fallback. Close, confirmed save and applied reload invalidate the view; refused or failed reload does not discard it.

Source fields render as text. Publication clones records and descriptor fields so a caller cannot mutate custody. Queries perform no writes. Existing totals, source rows, decisions and review events remain unchanged. Synthetic regressions and real core/HTTP/MCP comparisons are mechanics evidence; this contract does not certify original-source coverage or deployed client authentication.
