# Release runbook — not yet wired

Binding: klappy/kitchen HYGIENE 3 (PR and passing required checks), cook.md 10a (Git-connected deploy only), and 19 (single version authority). No seat deployment exception is granted here.

Before first app release: create/connect the app repository, keep private ingredients out of code, add the declared checks and Git-connected Cloudflare build, migrate current bootstrap sources, then verify dev behavior. Cookbook never deploys. Current prototype is committed locally but has no remote app repo or automatic release trigger.

Each change updates its capability/design contract before implementation. Include code, docs, schemas and tests in the same app PR. Run meaningful tests, preserve decisions, and verify no raw financial data enters the repo. Pin the tested commit and version from package.json. Follow required check gates and promotion rules; verify authenticated behavior on the deployed version after release.

For the PWA verify protected assets, manifest, icon dimensions, no offline ledger cache, install/open/login on iOS and Android, and mobile navigation. For Jev verify actual version and provenance; do not auto-accept from raw scores. For imports verify exact replay, conflicting lines, saved classifications and account/month balance controls.

Recovery: preserve source data and export reviewed decisions before a migration. Keep previous version/release evidence and a tested rollback. Do not reseed an initialized cloud ledger over user edits. Report a failed deployment or missing build binding as such, never as released.

Observed October 6, 2026: public app repo klappy/personal-finances-app created; PR1 carries core, contracts and CI. Cloudflare repository connection d1353f1c-117a-475c-883c-763b4e4c7089 exists in the existing account. No build trigger is attached yet, since production Worker/UI source migration and deploy configuration are still pending. Existing Worker tag is 8eb88806585a416384b28aa4eaace0ed. Do not attach an automatic production trigger until its reviewed branch contains a runnable, protected deployment.

House guidance promotion complete: kitchen#247 merge 5559ae1f1152b2fc4cee1ecde900d5b3cd4e1821 and kitchens#86 merge 7bab578e886e026688df161f29da27d97ddafa94. Terry remains draft; promotion is not activation.
