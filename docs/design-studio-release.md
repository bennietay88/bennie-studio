# Bennie Design Studio — controlled rollout (P0–P3)

## Existing-system audit (P0)
The current renderer is `src/components/WebsiteRenderer.tsx`; the website editor and save/publish workflows are in `src/components/WebsiteEditor.tsx`. They share `src/constants/designProfiles.ts` and approved section variants. `src/lib/designDirector.ts` already contains a guarded AI design-direction schema and prompt. `src/lib/designQa.ts` provides design assessment. No second renderer or website table is introduced.

## P0 audit findings
- Theme is stored in `websites.theme` and editor save calls the existing Supabase `websites` update endpoint; no new table or migration is required.
- `WebsiteRenderer` resolves `designProfile` and per-section `settings.variant` through existing approved renderer variants.
- `WebsiteGenerator` builds and ranks pages using `buildPagesFromBlueprint` and `evaluateGeneratedDesign`; packs are applied before candidate scoring.
- `WebsiteEditor` owns draft/review/publish controls; new Design Studio operations only stage editor state and do not call publish.
- `designQa` and `colorContrast` already provide design and WCAG checks. New pack validation reuses the contrast primitives.
- The backend AI router is `/api/ai/generate`, already authenticated and credit-based. The AI Director is explicitly triggered by a user button and uses the existing `website_draft` feature key.

## P1: Versioned packs and design tokens
`src/lib/designPacks.ts` defines three reviewed recipes, each using an existing design profile and approved section variants. Each pack has a stable ID, semver version, industry fit, design notes and references. The pack metadata is persisted in the existing `websites.theme` JSON through the website editor save workflow; legacy sites without metadata continue using the current resolver.

## P2: Composable admin workflow
The Design Studio tab in the existing website editor lets staff and site owners select a design pack, inspect three materially distinct mobile/desktop style simulations, review basic validation and apply changes **in editor state**. The Website Generator also supports a client-selected or industry-recommended approved design pack. The existing Save and live preview/publish workflows remain authoritative. Switching packs preserves all section copy, customer details and verification data.

## P3: Recommendation, review and quality gate
Default pack recommendations are explicitly **deterministic, rule-based**. A separate **Generate AI direction (uses credits)** button now calls the existing authenticated AI backend, validates output using `parseDesignDirection`, and requires a separate human action to stage the approved result. Design pack release checks validate semver, registry and allowed renderer variants. Automated tests cover pack validation, recommendations, no invented copy and non-mutation of original website. The studio offers the existing design QA result.

### Release checklist (run locally or in CI)
- `npm run lint`
- `npm run build`
- `node --import tsx --test tests/design-packs.test.ts`
- `npm run test:design`
- `npm run e2e`
- In both desktop and mobile: verify each pack using the **actual Open Preview renderer**, not only the simulation.
- Audit WCAG 2.2 AA contrast, keyboard navigation, reduced motion and Core Web Vitals (LCP, CLS, INP).
- Check client assets, testimonials, service areas and claims for authenticity.
- Obtain approval for each website. Never automatically modify or publish existing customers' sites.
- Publish pack upgrades as new semver, leave legacy sites pinned to their recorded pack version, and stage migrations separately.

### Monthly design research
The GitHub Actions workflow `.github/workflows/design-trend-review.yml` runs on the first day of each month (UTC) or manually. It uses `scripts/design-trend-review.mjs` to fetch a bounded list of editorial feed references and opens one review issue for the month. Failed sources are recorded explicitly. It **does not** create or publish a design pack, and can only start running after the PR is merged to the default branch and GitHub Actions runners are operational. A staff member must approve any new direction and implement it through the existing renderer and allowlist.

### Current CI and deployment infrastructure blocker
At the time of implementation, GitHub Actions workflow runs for the feature branch ended in seconds with `runner_id=0` and `steps=[]`. No TypeScript, build or browser checks executed. Inspect repository/organization Actions billing, allowance, policy and runner allocation; rerun CI once fixed. The linked Vercel project `bennietay-studio` was reported as `BLOCKED`, with no preview deployment for this feature branch. This code is **not** independently validated or released to production. Do not merge while required checks are failing.
