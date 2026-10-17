/**
 * Check both Stripe's customer history and Bennie Studio's account records.
 * Any lookup failure is allowed to throw so callers can fail closed.
 */
export async function isNewIntroOfferCustomer(email: string, stripe: any, supabase: any): Promise<boolean> {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) throw new Error("INTRO_OFFER_EMAIL_REQUIRED");

  const stripeCustomers = await stripe.customers.list({ email: normalizedEmail, limit: 1 });
  if ((stripeCustomers.data || []).length > 0) return false;

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id,business_id")
    .ilike("email", normalizedEmail)
    .limit(10);
  if (profileError) throw profileError;

  const profileRows = Array.isArray(profiles) ? profiles : [];
  const profileIds = profileRows.map((profile: any) => profile?.id).filter(Boolean);
  const businessIds = [...new Set(profileRows.map((profile: any) => profile?.business_id).filter(Boolean))];

  if (profileIds.length) {
    const { data: subscriptions, error: subscriptionError } = await supabase
      .from("user_subscriptions")
      .select("id,stripe_subscription_id")
      .in("user_id", profileIds)
      .not("stripe_subscription_id", "is", null)
      .limit(1);
    if (subscriptionError) throw subscriptionError;
    if (Array.isArray(subscriptions) && subscriptions.length > 0) return false;
  }

  if (businessIds.length) {
    const { data: businesses, error: businessError } = await supabase
      .from("businesses")
      .select("id,stripe_customer_id,stripe_subscription_id")
      .in("id", businessIds)
      .limit(10);
    if (businessError) throw businessError;
    if ((businesses || []).some((business: any) => business?.stripe_customer_id || business?.stripe_subscription_id)) return false;
  }

  return true;
}
