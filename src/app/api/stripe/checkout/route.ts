import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getStripe, getBundleById } from "@/lib/stripe";

const CheckoutSchema = z.object({
  bundleId: z.enum(["starter", "standard", "full"]),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const body = await req.json().catch(() => null);
  const parsed = CheckoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const bundle = getBundleById(parsed.data.bundleId);
  if (!bundle) {
    return NextResponse.json({ error: "Bundle not found" }, { status: 404 });
  }

  const origin = req.headers.get("origin") ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  const checkoutSession = await getStripe().checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: bundle.stripePriceId, quantity: 1 }],
    success_url: `${origin}/dashboard?purchase=success`,
    cancel_url: `${origin}/dashboard?purchase=cancelled`,
    metadata: {
      userId,
      bundleId: bundle.id,
      reviewsGranted: String(bundle.reviews),
    },
  });

  // Create pending Purchase record before redirecting
  await prisma.purchase.create({
    data: {
      userId,
      stripeSessionId: checkoutSession.id,
      bundleTier: bundle.id,
      reviewsGranted: bundle.reviews,
      amountCents: bundle.amountCents,
      status: "pending",
    },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
