# Journey catalog — draft v1

Scope/caps: smoke 5 minutes; targeted 20; full 45. Paid inference disabled by default. Each run pins a synthetic reset, build SHA and data revision. Unavailable UI/core integration is reported untested; no mock is described as a deployed result.

| ID | Priority | Goal and observable result | Cases |
|---|---|---|---|
| J1 | P0 | Monthly inflow/outflow and gap agree with core/HTTP/MCP under identical filters; missing months remain unknown | H-C,H-R,C-R |
| J2 | P0 | Import replay/link adds evidence once, never duplicate spending; invalid batch leaves state unchanged | W-I,C-C |
| J3 | P0 | Unauthorized access fails; actor comes from transport; stale write preserves newer decision | C-I |
| J4 | P0 | Home/work/combined and paid-reimbursement filter have matching, explicit meaning across surfaces | W-C,C-R |
| J5 | P1 | Category → merchants → monthly totals → source evidence explains the selected amount | H-C,C-C |
| J6 | P1 | Select baseline/subscription decisions, move home/work, normalize annual price and persist refresh without inventing missing-month averages | H-R,H-I |
| J7 | P1 | Classifier proposes; unknown/conflicting history requires review; unreviewed output cannot train; rejected proposal leaves expense unchanged | W-R,W-C |
| J8 | P2 | Export/reimport preserves sources, decisions and provenance; phone installation/auth session and accessible navigation work | W-I,H-I,C-C |

On fixes add the exact repro to P1. Full runs review flakiness and obsolete journeys. Financial equality uses integer cents or documented rounding, not screenshot similarity. Rendered UI failures need screenshot/trace and steps. Current J1/J4 UI parity remains a migration gap; core mechanics tests are not end-to-end journey passes.
