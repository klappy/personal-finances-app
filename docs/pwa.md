# PWA work state

Design specification: personal-finances-cookbook contracts/pwa.md (draft). Assets and mobile layout are staged under the local household-finances/cloudflare bootstrap, not incorporated into this core repo or released.

Phone identity: Money cookbook / Our money. Home-screen and maskable icons use generic house/book artwork. Manifest starts at protected root. Social image contains branding only. All static routes remain behind authentication, so unauthenticated social crawlers may see the login page.

Service worker is network-only and does not store a ledger, authenticated HTML or API response offline. Cloud save failure preserves edits in memory for export. Browser tab/scope preferences remain local. Installation must be initiated by the user; real-device install/session testing remains required.

Before moving UI into a code repository, remove embedded private source counts and balance snapshots from HTML, then migrate UI to the house framework under the shared-core contract. Do not use the cookbook as a deployment repository.
