import React from "react";

type CurrencyCode = "USD";

type CurrencyConfig = {
  code: CurrencyCode;
  symbol: string;
  rateFromUsd: number;
  prefixWithSpace?: boolean;
};

const DEFAULT_CURRENCY: CurrencyConfig = {
  code: "USD",
  symbol: "$",
  rateFromUsd: 1,
};

// Geographic audience detection may affect offers, never the billing currency.

const parseUsdAmount = (value: string | number) => {
  if (typeof value === "number") return value;
  const parsed = Number(String(value).replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrency = (amount: number, currency: CurrencyConfig) => {
  const rounded = Math.round(amount);
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(rounded);

  return currency.prefixWithSpace
    ? `${currency.symbol} ${formatted}`
    : `${currency.symbol}${formatted}`;
};

const currencyForCountry = (_countryCode?: string) => DEFAULT_CURRENCY;

export const formatUsdForCountry = (
  usdAmount: string | number,
  countryCode?: string,
) => {
  const currency = currencyForCountry(countryCode);
  return formatCurrency(parseUsdAmount(usdAmount) * currency.rateFromUsd, currency);
};

export const formatUsdRangeForCountry = (
  minUsd: string | number,
  maxUsd: string | number,
  countryCode?: string,
  options?: {
    from?: boolean;
    plus?: boolean;
  },
) => {
  const min = formatUsdForCountry(minUsd, countryCode);
  const max = formatUsdForCountry(maxUsd, countryCode);
  return `${options?.from ? "From " : ""}${min}-${max}${options?.plus ? "+" : ""}`;
};

export const useGeoPricing = () => {
  const [countryCode, setCountryCode] = React.useState("US");
  const [countryName, setCountryName] = React.useState("Global");
  const [discountPercentage, setDiscountPercentage] = React.useState(0);
  const [couponId, setCouponId] = React.useState<string | undefined>();

  React.useEffect(() => {
    let cancelled = false;

    const detectGeoPricing = async () => {
      try {
        const geoRes = await fetch("/api/public/geo-pricing");
        if (!geoRes.ok) throw new Error("Geo-pricing detection failed");
        const geoData = await geoRes.json();
        const detectedCode = String(geoData?.countryCode || "US").toUpperCase();

        if (!cancelled) {
          setCountryCode(detectedCode);
          setCountryName(geoData?.countryName || "Global");
          setDiscountPercentage(Number(geoData?.discountPercentage || 0));
          setCouponId(geoData?.couponId || undefined);
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          console.debug("Geo-pricing detection unavailable; using USD defaults.", err);
        }
      }
    };

    detectGeoPricing();

    return () => {
      cancelled = true;
    };
  }, []);

  const currency = currencyForCountry(countryCode);

  const convertUsd = React.useCallback(
    (
      usdAmount: string | number,
      options?: {
        yearlyMonthlyAverage?: boolean;
        applyGeoDiscount?: boolean;
      },
    ) => {
      let amount = parseUsdAmount(usdAmount);

      if (options?.yearlyMonthlyAverage) {
        amount = Math.round((amount * 10) / 12);
      }

      if (options?.applyGeoDiscount !== false && discountPercentage > 0) {
        amount *= 1 - discountPercentage / 100;
      }

      return amount * currency.rateFromUsd;
    },
    [currency.rateFromUsd, discountPercentage],
  );

  const formatUsd = React.useCallback(
    (
      usdAmount: string | number,
      options?: {
        yearlyMonthlyAverage?: boolean;
        applyGeoDiscount?: boolean;
      },
    ) => formatCurrency(convertUsd(usdAmount, options), currency),
    [convertUsd, currency],
  );

  const formatUsdRange = React.useCallback(
    (
      minUsd: string | number,
      maxUsd: string | number,
      options?: {
        from?: boolean;
        plus?: boolean;
        applyGeoDiscount?: boolean;
      },
    ) => {
      const min = formatCurrency(
        convertUsd(minUsd, { applyGeoDiscount: options?.applyGeoDiscount }),
        currency,
      );
      const max = formatCurrency(
        convertUsd(maxUsd, { applyGeoDiscount: options?.applyGeoDiscount }),
        currency,
      );
      return `${options?.from ? "From " : ""}${min}-${max}${options?.plus ? "+" : ""}`;
    },
    [convertUsd, currency],
  );

  return {
    countryCode,
    countryName,
    currency,
    discountPercentage,
    couponId,
    hasGeoDiscount: discountPercentage > 0,
    formatUsd,
    formatUsdRange,
  };
};
