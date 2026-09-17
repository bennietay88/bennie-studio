# Agency-grade design system

This document defines the premium design and motion standard for Bennie Studio managed websites.

## Goal

Every generated or managed website should feel intentionally art-directed, not template-produced. The visual target is the level of polish a small specialist agency might sell as a premium custom build, while preserving conversion clarity, accessibility, and performance.

## Core rules

1. **Art direction before animation**
   - Choose a design profile by industry, offer, brand personality, and proof assets.
   - Use asymmetric composition, deliberate whitespace, strong type hierarchy, and high-quality imagery before adding motion.

2. **Motion hierarchy**
   - Micro interactions: 160-260ms.
   - Section reveals: 420-650ms.
   - Expressive hero sequences: 700-1100ms.
   - Use one dominant motion idea per viewport.
   - Never animate every card just because JavaScript exists.

3. **GSAP only for cinematic moments**
   - GSAP is reserved for scroll-linked storytelling, pinned sequences, masked headline reveals, layered parallax, and advanced timelines.
   - Routine fades, hover states, buttons, accordions, and layout transitions stay on Motion/CSS.
   - This keeps bundle cost and complexity under control.

4. **Reduced motion is mandatory**
   - Respect `prefers-reduced-motion`.
   - Disable scroll-linked parallax, looping motion, and pinned sequences for reduced-motion users.

5. **Premium interaction patterns**
   - Masked headline reveal.
   - Image clip reveal with subtle scale settle.
   - Staggered proof/logo rows.
   - Directional card hover with depth capped to a few pixels.
   - Magnetic CTA only on pointer devices and only for primary CTAs.
   - Scroll progress treatment on long editorial pages.
   - Case-study image transitions and before/after sequences where useful.

6. **Performance budget**
   - No animation library should block first paint.
   - Cinematic motion code should be lazy-loaded.
   - Transform and opacity are preferred over layout-triggering properties.
   - Avoid permanent `will-change` on large surfaces.

## Design profiles

- Editorial Luxury: restrained motion, oversized typography, editorial imagery, asymmetry.
- Modern Minimal: precise grid, low-noise interactions, crisp spacing.
- Bold Contemporary: expressive type, bolder color fields, faster movement.
- Trust / Authority: proof-first, conservative motion, excellent readability.
- Craft / Organic: human photography, tactile transitions, softer spatial rhythm.
- Cinematic Studio: premium hero sequences, masked typography, layered image motion, immersive spacing.

## QA gate

A site should not be considered launch-ready when any of these are true:

- More than three visual animation styles appear on one page.
- A decorative animation delays or obscures a CTA.
- Hover effects are required to understand content.
- The page causes layout shift during reveal animation.
- Reduced-motion users still receive parallax or looping animation.
- Hero copy is longer than the visual hierarchy can support.
- Every section uses the same card grid.
- Stock-looking imagery is doing more work than the offer or proof.

The standard is restraint plus specificity. Premium is not the number of moving objects on screen. It is the feeling that every movement, spacing decision, image crop, and line of copy belongs there.
