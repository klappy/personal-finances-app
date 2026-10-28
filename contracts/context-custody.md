# Context custody contract — v1

Owner: L5 pure context projection, composed by existing query collection=snapshot. No new tool, collection, HTTP endpoint or mutation is required to read it. The existing snapshot response gains `context_evidence` while retaining original fields unchanged. Query accepts collection=snapshot only: financial scope/period filters do not apply to historical context. Unsupported snapshot query filters must fail explicitly.

## Output

`context_evidence`: contract=context-custody@1, revision=current state revision, scope=historical_context_unfiltered, fields=[descriptors], months=[original snapshot month metadata], completeness_verified=false. Supported descriptor paths are arrays of string/integer segments, never executable strings: [source_status], [as_of], [reference_notes,key], [coverage,index,name], [coverage,index,status], [coverage,index,months,month]. Coverage descriptors retain original entry order; month headings use original core snapshot month sequence. Known zero, missing field and null remain distinct. Only own existing note keys are enumerated. An absent/null reference_notes container receives a container descriptor. A renderer asking for a non-enumerated note treats it as unavailable; no invented note-key list or fallback text asserts source evidence.

Each descriptor has path, value (cloned original JSON value or null when absent), presence=present|missing, value_kind=string|number|null|other, references=[], conflicting_references=[], custody_status=unknown|derivative_reference|conflicting_declarations, label, original_source_verified=false, bank_match_verified=false. References carry source_id/source_type=Snapshot/source_hash/observed_at/field_path. Counts are not corroboration. Stable ordering uses literal path/source identity ordering. All returned objects are detached from state.

## Reference matching

A runtime reference qualifies only when its immutable payload owns the exact supported field path and JSON-structural value equality holds. Reference-note runtime payloads support [reference_notes,key]; runtime evidence currently has no source_status/as_of/coverage payload, so those fields remain unknown. A source with the same path and a different value is retained as a conflicting declaration, never silently attached as matching. Deduplicate identical source_id + field_path + hash; inconsistent duplicate identities become conflicting. Conflicts remain visible even when an exact matching declaration also exists. References identify imported derivative bytes, not original email/bank custody.

Legacy Snapshot transaction references never qualify as context-field evidence. Current normalization does not persist an immutable original context payload and explicit context migration link independently of mutable dashboard_context. Therefore current snapshot origin is unknown for these fields; do not infer it from a dashboard-snapshot source_id prefix, first transaction, current hash, or import receipt digest. No backfill may fabricate a migration link. A future migration contract may preserve an explicit immutable context registry; that is separately reviewed work, not required to label existing uncertainty honestly.

## Bounds and behavior

This is a complete context descriptor attachment to an already complete snapshot export, not a bounded transaction query. Descriptors cover only supported fields, not transaction/decision/whole-context recursion. Existing snapshot export limits remain an acknowledged import validation gap; do not silently truncate descriptors or claim full field custody. reference_notes runtime import is already capped at100 keys/20,000 characters each. Unsupported malformed historical coverage containers yield an unavailable descriptor, not an exception that prevents the valid ledger from loading. Safe own-property traversal and reserved-key rejection are required. Undefined is represented by presence=missing/value=null; no prototype traversal.

Read-time projection never writes or changes revision. Frontend uses loaded snapshot revision and formats its context_evidence; confirmed reload follows existing snapshot lifecycle. After save advances revision, the attachment retains its original revision; the renderer marks it historical/stale until a current snapshot is fetched. It must never relabel the attachment as current. Classification/decision changes may change revision but do not upgrade evidence. HTTP snapshot and MCP query snapshot return identical DTOs. Legacy raw text stays available; adjacent text explicitly says historical context, unfiltered, derivative/unknown custody. This preserves the original notes and avoids treating narrative as fresh verified financial totals.

## Verification

Synthetic cases: exact note reference; same key different value; no evidence; unrelated transaction Snapshot; missing/null/zero; unusual key segments; duplicated refs/conflict; returned DTO mutations leave state unchanged; read byte hash unchanged; historical malformed coverage; core month order. Actual core/HTTP/stdio snapshot comparison validates descriptor equality and revision without rewriting private source state. Render notes/coverage inside existing mock scope only after design adoption; no formal FOLLOW implied.

## Separate formatter cleanup

Remove moneyCard numeric-average fallback. All current callers use core measure/series DTOs. Render null monthly/period metrics as unavailable, preserve estimated/status notes, and perform no division in the client. Presentation geometry may still compute widths; that is not a financial amount calculation.

Status: locally implemented; independent core review passed. UI/schema integration and release verification pending. No deployment certification.
