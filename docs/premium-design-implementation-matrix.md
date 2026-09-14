# Premium design implementation matrix

| Requirement | Existing implementation | Relevant files | Decision | Proposed change | Risk |
|---|---|---|---|---|---|
| Shared renderer | One `WebsiteRenderer` already renders preview and published sites | `src/components/WebsiteRenderer.tsx` | EXTEND | Add profile-aware tokens, reduced-motion behaviour, and safe legacy fallbacks | Low |
| Theme configuration | `Website.theme` has colours, font and legacy style presets | `src/types.ts`, `src/components/WebsiteEditor.tsx` | EXTEND | Add approved design, typography, spacing, motion and image profiles | Low |
| Section system | Typed section types with reusable templates | `src/types.ts`, `src/constants/sectionTemplates.ts` | EXTEND | Add section variant metadata instead of duplicate renderers | Low |
| Page composition | Industry blueprints already choose page/section order | `src/constants/pageBlueprints.ts` | EXTEND | Add approved composition guidance and profile defaults | Low |
| Motion | `motion/react` is already used throughout the renderer/editor | `src/components/WebsiteRenderer.tsx` | REUSE | Keep Motion; add profile tokens and `prefers-reduced-motion` guard | Low |
| AI content | Internal staff-only draft route exists with provenance and review states | `api/index.ts`, `src/lib/internalAiContentEngine.ts` | EXTEND | Add humanise-content draft schema/prompt; never auto-publish | Medium |
| Design direction AI | No structured approved-option director found | `src/lib/` and admin routes | NEW (small) | Add pure schema/prompt/parser for approved profiles; API integration remains staff-gated | Medium |
| Design QA | Existing button/SEO checks, but no visual-quality rubric | `src/lib/websiteButtons.ts`, tests | NEW (pure) | Add deterministic internal QA rubric and tests | Low |
| Media | Existing image upload and responsive image usage | `src/components/ImageUpload.tsx`, renderer | EXTEND | Add focal-point/alt metadata fields without destructive transforms | Medium |
| Admin controls | General theme controls and presets already exist | `src/components/WebsiteEditor.tsx` | EXTEND | Add profile selectors and profile-aware preset application | Low |

Legacy websites remain valid: missing profile fields resolve to `modern_minimal` and keep their existing `style`, colours and font.
