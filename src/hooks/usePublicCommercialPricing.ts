import React from "react";
import {
  COMMERCIAL_FALLBACK_PRODUCTS,
  type CommercialMarket,
  type CommercialProduct,
} from "../lib/commercialPricing";

type PublicPricingPayload = {
  products?: Array<Omit<CommercialProduct, "prices"> & { price?: CommercialProduct["prices"][number] | null }>;
};

export function usePublicCommercialPricing(market: CommercialMarket) {
  const [products, setProducts] = React.useState<CommercialProduct[]>(COMMERCIAL_FALLBACK_PRODUCTS);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch(`/api/public/pricing?market=${market}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Pricing unavailable");
        return response.json() as Promise<PublicPricingPayload>;
      })
      .then((payload) => {
        if (cancelled || !Array.isArray(payload.products) || payload.products.length === 0) return;
        setProducts(payload.products.map((product) => ({
          ...product,
          prices: product.price ? [product.price] : [],
        })) as CommercialProduct[]);
      })
      .catch(() => {
        if (!cancelled) setProducts(COMMERCIAL_FALLBACK_PRODUCTS);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [market]);

  return { products, loading };
}
