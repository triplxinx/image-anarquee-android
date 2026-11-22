# iMAG3 Anarqeə! — Project history and requirements register
## About
iMAG3 Anarqeə! (I.A., Image Anarquee; previously Archive Desk Studio) is a native-Android-first creative commerce operating environment for converting owned photographs, artwork, designs, collectibles and creative services into verifiable paid opportunities. The intended loop is intake → discover → qualify → produce → sell/deliver → learn. It is intended to be local-first, low-cost, explainable and usable without mandatory paid AI services. Companion projects include archive-launch-desk, affiliateflow-pro, imagecraft and classyassvintage; do not duplicate their code without a deliberate migration.

## Revision history (requirements chronology; NOT Git commit history)
- 2026-10-31: Image processing/Inkloom direction: 50 baseline images, many-to-one overlays, 1/2/3 style modes, black-and-white coloring pages, 5 concurrent jobs, per-image/global progress, pause/restart/abort, ZIP/PDF exports. Later requested psychedelic melt, single-line/fractal art, checkerboard, hearts, stars, smiley micro-patterns, preview and control refinements. Treat as related imagecraft capability pending integration decision.
- 2026-11-16–17: Fast-revenue Archive Launch Desk: photo licensing, paid commissions, digital deliverables, verified live leads, Seattle/PNW and worldwide reach, zero-upfront-cost opportunities, Maps/business SEO gaps, cold-call pitches and buyer evidence.
- 2026-11-17: Workdesk manual/semi/full drafting, speculative demand-vs-competition scoring, one actionable contact per workload, source provenance, credibility checks, standard time/volume/pay gates, human approval. Prior discussions report a v1.5 Workdesk; this repo does not verify its code.
- 2026-11-18: Native APK rewrite; two builds (payments/business invoicing and private affiliate workflows), secure PayPal Business integration, Washington tax handling, affiliate obligations visible at selection, real endpoints rather than mocks. No bypass of paywalls or payment security.
- 2026-11-18–20: Album imports (Google Photos up to 500 at a time), optional 4× enhancement, 50-item review queue, crop and lazy loading, saved pitch drafts, swipe/archive, lead scoring, influencer scouting, POPCUSTOMS/XXXINK store integration, metadata updates and Cloudflare storefront exports.
- 2026-11-20: Seven-board discovery; local/worldwide scope, multiple source categories, pagination, refresh, deduplication, disappeared-lead flags, JSON/JSONL/NDJSON up to 5,000 records / 8 MiB, preserve previous results on failed refresh. Earlier discussion reports tests for 10,000 records; not validated in this starter.
- 2026-11-20–21: Comprehensive app pitch, first-hour onboarding, permanent (?) help toggle to (!) with per-control explanations and multipart walkthroughs, reference-driven high-density expressive UI, 3m33s idle mentor, optional LLM with offline fallback.
- 2026-11-21: Structural robustness review, efficient migration to Kotlin/native Android, GitHub-linked source handoff and codebase reconciliation.

## Exhaustive requested feature inventory
### Asset intake and rights
- [ ] Import locally and via explicitly authorized Google Photos integration; resumable 500-item batches; 50-item review queues.
- [ ] Tag provenance, ownership, license restrictions and releases; private-by-default originals; thumbnail/lazy loading; crop, optional upscale and duplicate detection.
- [ ] Collect and catalog existing designs, photo archives, scripts, video and collectible images without publishing unlicensed or sensitive assets.
### Research and lead intelligence
- [ ] Seven-board opportunities; photo licensing, commercial shoots, digital services, influencer/affiliate, merchandising, collectible and niche products.
- [ ] Source-backed active lead and verified contact, payment evidence and reliability labels; geographic scope Seattle/PNW/worldwide.
- [ ] Live refresh, concurrent pagination, ranked demand/competition, SEO/site-gap business prospecting using permitted APIs/data, dedupe and stale/disappeared flags.
- [ ] JSON/JSONL/NDJSON bounded imports (5,000 records / 8 MiB); preserve last good results on failure; clear rate-limit and provenance warnings.
### Workbench and monetization
- [ ] Manual/semi/full draft creation for licensing proposals, landing pages, email automation, SEO, business profiles, scheduling and customer-service offers.
- [ ] [lead]_pitch-v#.md versioning, saved drafts, archive swipe, deliverable previews, scope/rate estimates, mandatory human review before sending.
- [ ] Optional rate-limited LLM and no-API mode; never invent leads or claim actual sales from speculative demand.
- [ ] POPCUSTOMS store/product metadata and order integration, XXXINK catalog sync, affiliate program scouting, influencer outreach, program obligations/disclosures, free-tier hosting and export.
- [ ] PayPal Business supported checkout/invoicing; tax determination and Washington compliance with validated provider integration; separate business and private affiliate variants.
### Scanner, experience and operations
- [ ] Trading-card scanner with white/black calibration, flashlight, automatic quality-gated capture, manual HQ mode, safe CPU burst, grading-reference display.
- [ ] Native Kotlin Android architecture, persistent local database, permissions, encrypted secrets, consent-based integrations, reliable sync, signed APKs, CI and device testing.
- [ ] Expressive reference-led UI; skippable first-hour onboarding; persistent (?)→(!) help, contextual component explanations and multipart walkthroughs.
- [ ] Idle mentor after 3m33s, contextual monetization hints, quotes and accessibility controls.
- [ ] Android + GitHub Pages/Cloudflare dashboard coordination; downloadable static storefront exports and no-cost-first operation.

## Verified in THIS repository
- Initial Kotlin activity and simple contextual help dialog scaffold, Gradle/manifest starter, README and roadmap.
- NOT verified: successful Android build, external service integration, persistence, functional scanner, secure payments or live lead retrieval.
## Prior implementation reports requiring migration audit
Previous conversations described Workdesk v1.5, iA v1.6 opportunity ingestion, affiliate v1.7, merchandising v1.9 and imagecraft/Inkloom variants. Those reports are historical claims, not proof these modules exist in this repository. Compare their actual repositories/source before importing.

## Prioritized TODO / alteration backlog
1. [ ] Audit archive-launch-desk, affiliateflow-pro, imagecraft and any exported iA/Lovable source; build source-to-feature traceability, preserving authorship and licenses.
2. [ ] Make Android starter build reproducibly; establish tests, app modules, Room data model, permissions, secrets and crash handling.
3. [ ] Implement rights-aware portfolio intake and durable refresh/lead import with verified provenance.
4. [ ] Add Workdesk draft/approval and no-mock source evidence before any outreach automation.
5. [ ] Implement compliant affiliate/POPCUSTOMS integrations, invoices, payment and tax review.
6. [ ] Implement scanner and advanced onboarding/help/idle UX; accessibility/device testing.
7. [ ] Establish privacy/security threat model, performance budgets, offline and rate-limit behavior, release pipelines.
8. [ ] Document migration outcomes as verified changes in CHANGELOG.md; keep unverified items marked pending.

## Historical integrity
This is a reconstruction of accessible request history, not an exhaustive export of every past prompt. Dates indicate conversations/iterations, not repository releases. Do not treat an unchecked feature as implemented.
