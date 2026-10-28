# Commitment decision discovery — v1

commitment-contract.mjs owns shared billing-frequency vocabulary, recommended labels, recognized amount-field names and discovery meanings. Validation, projection and UI consume those constants. Calculations stay in commitmentProjection; this unit does not tighten existing data compatibility.

Frequency is enforced when present: Unconfirmed/Monthly/Annual/One-time. Decision labels Keep/Review/Business/Consider cutting are recommended summary buckets, not currently type/enum validation; Business alone does not move scope. Truthy budgetScope must be home/work; falsy/missing uses existing inference. essential/workEssential must be booleans when present.

billingCharge falls back to latest observed charge when null/missing. baselineAmount/workBaselineAmount fall back to target, then monthly schedule. target null/missing is unset; zero is explicit. monthlyAmount is validated compatibility metadata but is not consumed by the projection. Amount validation uses Number conversion, allowing numeric strings, booleans, empty strings and some arrays/objects whose conversion is finite/nonnegative; numbers are recommended. Null/missing remain allowed. No schema falsely claims stricter enforcement.

Whole-string commitment entries may be saved only unchanged from the current state. Unknown object properties are retained by current validation and ignored by the projection. Edited legacy labels use commitmentDecision to preserve compatible siblings.

UI category-target blank deletes its key; commitment-target blank writes null. Billing-charge and baseline blank currently become numeric zero. Discovery states those distinctions explicitly; no recurrence/obligation/cancellation/savings certification is implied. Move preparation preserves existing destination fields, including zero/false/null amounts, and seeds only absent values. See decision-preparation.md.
