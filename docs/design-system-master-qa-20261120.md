# Bennie Studio — Master Design System & UI Release Checklist
Version: 2026-11-20 · Applies to app.bennietay.com public marketing and business app UI.

## Single source of truth: surfaces
- Primary canvas: #F8FAFC or #F4F6FA.
- Elevated cards: #FFFFFF with 1px #E2E8F0 border, 16px radius, subtle shadow.
- Royal cobalt primary actions: #1D4ED8 (hover #2563EB), white foreground.
- Obsidian navy anchor: #0F172A. On the homepage, reserve it for the "More than a pretty website" strip, Website Growth pricing card, and global footer only.
- No consecutive navy-navy or blue-blue bands; aim for slate canvas > dark value anchor > light > bordered white cards > cobalt conversion banner > navy footer.
- Contrast: content on light #475569 minimum, on dark #CBD5E1 minimum. Brand accents are not readable body-text defaults.
- Preview mockups can retain **inside-preview** industry colors; they cannot dictate the host section or outer CTA styling.

## Typography
- Public marketing H1 44–56px desktop, 32–36px mobile; bold sans serif, 1.1 line-height.
- Section H2 32–40px, left-aligned.
- Reading body and cards: >=16px, 1.55 line-height.
- Serif italic editorial emphasis at most once per section, only in H1 or H2 (never buttons or prose).
- Smaller fonts only for legal footnotes, timestamps, chart axes, badges and compact table metadata; never for continuous marketing copy.

## Structure and component anatomy
- Public container max-width 1280px, mobile gutters 24px, desktop 48px.
- Desktop split hero uses CSS grid columns minmax(0,1.15fr) minmax(0,0.85fr) and >=48px column gap.
- Constrain previews to max-width:100%, min-width:0 and overflow-hidden track. Never overlap the hero copy. No competitor display headlines inside the preview.
- Asymmetric section headers: heading side ~50%, explanation + text link side ~45% above the content grid.
- No consecutive numbered step grids: reserve numbers 01–04 for chronological process; use line icons for feature/benefit grids.
- One primary royal-blue CTA per section paired with a plain-text/outline secondary action.
- Preview/template showcase cards: top "App-rendered showcase • Concept direction" badge; 16:10 thumbnail, industry tag, outcome title, short summary, single action link. Cards within one row stretch equally with bottom-aligned link.
- Public forms: white elevated cards, 16px radius, 32–40px padding, legible field labels, explicit in-form state and accurate "No payment or account required" note.
- Shared sticky header must render the five navigation links, client login and a free-preview CTA. Shared footer contains four link groups on navy.

## Route QA matrix
Every release candidate MUST be inspected at 1440x900, 1024x820 and 390x844 on:
- / (homepage)
- /services
- /dental-clinics
- /website-audit
- /templates
- /book-demo
- /contact

Browser assertions (see e2e/marketing-design-system.spec.ts):
1. Same shared header + footer and five primary navigation links.
2. H1 width/size, desktop hero clearance >=40px, zero horizontal overflow.
3. Surface rhythm (visually verify no two cobalt/navy panels touch).
4. Equal-height 3/4-column cards and bottom-aligned CTAs.
5. One main CTA per section, with readable labels and sufficient contrast.
6. On mobile, text-first → visual-second ordering with clean stacks and no text clipping.

## Code work completed on branch (still requires browser QA)
- Updated the global public color/typography/container tokens and hero boundary.
- Updated shared header/footer cobalt/obsidian colors, 4-column footer group layout and mobile gutters.
- Converted booking and automated-website-review forms to bordered white elevated surfaces.
- Updated homepage proof to light cards and aligned Website Growth pricing grid CTA layout.
- Added a separate, bounded, slate/cobalt sales intelligence workbench.
- Introduced automated viewport and Chrome/footer checks; CI results are the acceptance authority.

## Release rules
Do not declare the UI complete merely because Vercel says Ready. Inspect rendered screenshots at the three viewport widths for every listed route. Fix any test failures and manually audit sections, unusual CMS page content, interactive forms, text contrast, card rows, touch targets, template previews and sticky header/footer overlays.

Avoid blind global CSS rewrites that change customer-generated website templates, logged-in dashboards, or legal document printing. CMS override pages must use the same wrapper, header, footer and tokens; investigate outliers before release.
