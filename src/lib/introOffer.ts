/**
 * Optional introductory commitment for NEW managed-website customers.
 *
 * A one-time Stripe coupon offsets the first monthly service invoice.
 * One-time setup remains payable at checkout. No retroactive subscription
 * changes and no automatic offer on existing customer upgrades.
 */
export const INTRO_OFFER_CODE = "FIRST_MONTH_FREE_12M" as const;
export const INTRO_OFFER_TERM_MONTHS = 12;

export function getIntroductoryQuote(
  monthlyPrice: number,
  setupFee: number,
  standardTermMonths: number,
  offerSelected: boolean,
) {
  const monthly = Math.max(0, Number(monthlyPrice) || 0);
  const setup = Math.max(0, Number(setupFee) || 0);
  const standardTerm = Math.max(1, Math.round(Number(standardTermMonths) || 3));
  const discount = offerSelected ? monthly : 0;
  const termMonths = offerSelected ? INTRO_OFFER_TERM_MONTHS : standardTerm;
  return {
    offerCode: offerSelected ? INTRO_OFFER_CODE : null,
    discount,
    termMonths,
    firstMonthService: monthly - discount,
    dueToday: setup + monthly - discount,
    // Initial 12-month term includes the free first monthly service cycle.
    totalInitialTerm: setup + monthly * termMonths - discount,
    recurringFromMonth2: monthly,
  };
}
