import type { MotionProfileId } from "../constants/designProfiles";
export const SITE_MOTION_PROFILES = [
  { id: "none", label: "Off", description: "No enhanced motion." },
  { id: "subtle", label: "Subtle", description: "Quiet feedback for professional and trust-led websites." },
  { id: "refined", label: "Refined", description: "Gentle reveals and polished interactive details." },
  { id: "expressive", label: "Expressive", description: "Stronger reveals and responsive visual depth." },
  { id: "cinematic", label: "Cinematic", description: "Layered entrance and portfolio motion for visual brands." },
] as const satisfies ReadonlyArray<{ id: MotionProfileId; label: string; description: string }>;
export const SITE_MOTION_SETTINGS: Record<MotionProfileId, { duration: number; distance: number; stagger: number; spotlight: boolean }> = {
  none: { duration: 0, distance: 0, stagger: 0, spotlight: false },
  subtle: { duration: 240, distance: 4, stagger: 30, spotlight: false },
  refined: { duration: 440, distance: 9, stagger: 55, spotlight: false },
  expressive: { duration: 560, distance: 13, stagger: 70, spotlight: true },
  cinematic: { duration: 680, distance: 17, stagger: 85, spotlight: true },
};
export function resolveSiteMotionProfile(value?: string | null): MotionProfileId {
  return SITE_MOTION_PROFILES.find(profile => profile.id === value)?.id ?? "refined";
}
