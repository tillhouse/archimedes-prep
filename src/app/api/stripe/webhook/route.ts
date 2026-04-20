import { NextRequest, NextResponse } from "next/server";
import { getStripe, getBundleById } from "@/lib/stripe";
import prisma from "@/lib/prisma";

// Must use raw body for Stripe signature verification
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event;
  try {
    event = getStripe().webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook signature verification failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const checkoutSession = event.data.object;
    const stripeSessionId = checkoutSession.id;
    const stripePaymentId =
      typeof checkoutSession.payment_intent === "string"
        ? checkoutSession.payment_intent
        : null;

    const purchase = await prisma.purchase.findUnique({
      where: { stripeSessionId },
    });

    if (!purchase) {
      // Could be a session created outside this app; ignore gracefully
      return NextResponse.json({ received: true });
    }

    if (purchase.status === "complete") {
      // Idempotent: already processed
      return NextResponse.json({ received: true });
    }

    const bundle = getBundleById(purchase.bundleTier);
    const reviewsGranted = bundle?.reviews ?? purchase.reviewsGranted;

    await prisma.$transaction([
      prisma.purchase.update({
        where: { stripeSessionId },
        data: { status: "complete", stripePaymentId },
      }),
      prisma.user.update({
        where: { id: purchase.userId },
        data: { reviewsPurchased: { increment: reviewsGranted } },
      }),
    ]);
  }

  return NextResponse.json({ received: true });
}
