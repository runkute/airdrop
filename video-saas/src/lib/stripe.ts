import Stripe from "stripe";

declare global {
  // eslint-disable-next-line no-var
  var _stripe: Stripe | undefined;
}

export const stripe =
  globalThis._stripe ??
  new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
    apiVersion: "2026-04-22.dahlia",
    typescript: true,
  });

if (process.env.NODE_ENV !== "production") globalThis._stripe = stripe;

// ---------------------------------------------------------------------------
// Credit packages — keyed by Stripe Price ID
// ---------------------------------------------------------------------------

export const CREDIT_PACKAGES: Record<
  string,
  { credits: number; label: string; usd: number }
> = {
  [process.env.STRIPE_STARTER_PRICE_ID ?? "__starter__"]: {
    credits: 259,
    label: "Starter",
    usd: 14,
  },
};
