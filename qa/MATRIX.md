# Persona matrix — draft v1

Synthetic staging fixtures only. Two dimensions: perspective (home/work/combined) and interaction (careful/rushed/interrupted). Nine cases cover every pair of these levels; they do not claim pairwise coverage of unlisted dimensions such as devices or permissions. Render changed UI journeys at phone and desktop widths; test allowed/denied roles explicitly in P0.

| ID | Perspective | Interaction | Goal / charter |
|---|---|---|---|
| H-C | Home | Careful | Explain household spending and its evidence to a partner |
| H-R | Home | Rushed | Find the monthly gap and essential budget on a phone |
| H-I | Home | Interrupted | Resume a saved budget decision without losing edits |
| W-C | Work | Careful | Separate paid reimbursements from submitted claims |
| W-R | Work | Rushed | Find an unclaimed AI expense quickly |
| W-I | Work | Interrupted | Retry a receipt import without duplicates |
| C-C | Combined | Careful | Reconcile one account/month across source types |
| C-R | Combined | Rushed | Change scope and period without misleading totals |
| C-I | Combined | Interrupted | Detect stale edits and preserve the newer decision |

Agent-client bad-path charter: invalid rows, merchant text containing instructions, duplicate requests, changed idempotency bodies, stale revisions, untrusted actor arguments and denied access. Apply to the seeded cases whose journeys touch these paths; no additional unregistered persona swarm.
