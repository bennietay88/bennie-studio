import React from "react";
import {
  COMMERCIAL_FALLBACK_PRODUCTS,
  type CommercialMarket,
  type CommercialProduct,
} from "../lib/commercialPricing";

type PublicPricingPayload = {
  products?: Array<Omit<CommercialProduct, "prices"> & { price?: CommercialProduct["prices"][number] | null }>;
};

type PricingState = {
  market: CommercialMarket | null;
  products: CommercialProduct[];
  loading: boolean;
  error: string | null;
};

// Never display stale amounts from another pricing request. New-customer pricing is USD-only.
// If pricing cannot be verified, show package descriptions without any amounts.
const unpricedProducts = (): CommercialProduct[] =>
  COMMERCIAL_FALLBACK_PRODUCTS.map((product) => ({ ...product, prices: [] }));

export function usePublicCommercialPricing(_market: CommercialMarket) {
  // Every public and newly issued commercial price uses the verified USD book.
  const market: CommercialMarket = "INTL";
  const [state, setState] = React.useState<PricingState>({
    market: null,
    products: unpricedProducts(),
    loading: true,
    error: null,
  });

  React.useEffect(() => {
    const controller = new AbortController();
    let timedOut = false;
    setState({ market, products: unpricedProducts(), loading: true, error: null });

    // Bound the wait so a stalled public API never leaves pricing cards in a
    // permanent loading state. The fallback contains no unverified amounts.
    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
      setState({
        market,
        products: unpricedProducts(),
        loading: false,
        error: "Live pricing is taking too long to load.",
      });
    }, 8000);

    fetch(`/api/public/pricing?market=${encodeURIComponent(market)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Live pricing is temporarily unavailable.");
        return response.json() as Promise<PublicPricingPayload>;
      })
      .then((payload) => {
        if (controller.signal.aborted) return;
        if (!Array.isArray(payload.products) || payload.products.length === 0)
          throw new Error("Live pricing is temporarily unavailable.");
        const products = payload.products.map((product) => ({
          ...product,
          // Never substitute an unverified or different-market price.
          prices: product.price?.market === market ? [product.price] : [],
        })) as CommercialProduct[];
        setState({ market, products, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          market,
          products: unpricedProducts(),
          loading: false,
          error: error instanceof Error ? error.message : "Live pricing is temporarily unavailable.",
        });
      })
      .finally(() => {
        if (!timedOut) window.clearTimeout(timeoutId);
      });

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [market]);

  // Verified USD pricing takes effect during render, *before* the fetch effect runs.
  const marketMatches = state.market === market;
  return {
    products: marketMatches ? state.products : unpricedProducts(),
    loading: !marketMatches || state.loading,
    error: marketMatches ? state.error : null,
  };
}
