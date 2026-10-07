# Release runbook — not yet wired

Binding: klappy/kitchen HYGIENE 3 (PR and passing required checks), cook.md 10a (Git-connected deploy only), and 19 (single version authority). No seat deployment exception is granted here.

Before first app release: create/connect the app repository, keep private ingredients out of code, add the declared checks and Git-connected Cloudflare build, migrate current bootstrap sources, then verify dev behavior. Cookbook never deploys. Current prototype is committed locally but has no remote app repo or automatic release trigger.

Each change updates its capability/design contract before implementation. Include code, docs, schemas and tests in the same app PR. Run meaningful tests, preserve decisions, and verify no raw financial data enters the repo. Pin the tested commit and version from package.json. Follow required check gates and promotion rules; verify authenticated behavior on the deployed version after release.

For the PWA verify protected assets, manifest, icon dimensions, no offline ledger cache, install/open/login on iOS and Android, and mobile navigation. For Jev verify actual version and provenance; do not auto-accept from raw scores. For imports verify exact replay, conflicting lines, saved classifications and account/month balance controls.

Recovery: preserve source data and export reviewed decisions before a migration. Keep previous version/release evidence and a tested rollback. Do not reseed an initialized cloud ledger over user edits. Report a failed deployment or missing build binding as such, never as released.
