import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-02-24.acacia",
    });
  }
  return _stripe;
}

export interface BundleTier {
  id: "starter" | "standard" | "full";
  label: string;
  reviews: number;
  amountCents: number;
  stripePriceId: string;
}

export const BUNDLES: BundleTier[] = [
  {
    id: "starter",
    label: "Starter",
    reviews: 3,
    amountCents: 2900,
    stripePriceId: process.env.STRIPE_PRICE_STARTER!,
  },
  {
    id: "standard",
    label: "Standard",
    reviews: 5,
    amountCents: 3900,
    stripePriceId: process.env.STRIPE_PRICE_STANDARD!,
  },
  {
    id: "full",
    label: "Full",
    reviews: 10,
    amountCents: 5900,
    stripePriceId: process.env.STRIPE_PRICE_FULL!,
  },
];

export function getBundleById(id: string): BundleTier | undefined {
  return BUNDLES.find((b) => b.id === id);
}
