export type OutreachQualificationInput = {
  fitScore: number;
  intentScore: number;
  issueScore: number;
  offerFitScore: number;
  contactScore: number;
  recencyScore: number;
  intentEvidence: string;
  intentSourceUrl: string;
  intentObservedAt: string;
  identityAndContactVerified: boolean;
  marketRulesChecked: boolean;
};

const SCORE_LIMITS = {
  fitScore: 20,
  intentScore: 30,
  issueScore: 20,
  offerFitScore: 15,
  contactScore: 10,
  recencyScore: 5,
} as const;

export function evaluateOutreachQualification(input: OutreachQualificationInput, now = new Date()) {
  const totalScore = (Object.keys(SCORE_LIMITS) as Array<keyof typeof SCORE_LIMITS>)
    .reduce((sum, key) => sum + Number(input[key] || 0), 0);
  let sourceIsValid = false;
  try {
    const source = new URL(String(input.intentSourceUrl || ""));
    sourceIsValid = source.protocol === "https:" && Boolean(source.hostname);
  } catch { sourceIsValid = false; }
  const observedAt = new Date(String(input.intentObservedAt || ""));
  const ageMs = now.getTime() - observedAt.getTime();
  const intentIsCurrent = Number.isFinite(observedAt.getTime()) && ageMs >= 0 && ageMs <= 45 * 24 * 60 * 60 * 1000;
  const evidenceIsSpecific = String(input.intentEvidence || "").trim().length >= 20;
  const scoresAreValid = (Object.keys(SCORE_LIMITS) as Array<keyof typeof SCORE_LIMITS>)
    .every((key) => Number.isInteger(input[key]) && input[key] >= 0 && input[key] <= SCORE_LIMITS[key]);
  const eligible = scoresAreValid && totalScore >= 80 && input.intentScore >= 15 &&
    sourceIsValid && intentIsCurrent && evidenceIsSpecific &&
    input.identityAndContactVerified === true && input.marketRulesChecked === true;
  return { totalScore, intentIsCurrent, sourceIsValid, evidenceIsSpecific, scoresAreValid, eligible };
}
