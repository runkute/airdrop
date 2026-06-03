import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

const PLANS = {
  starter: {
    priceId: process.env.STRIPE_STARTER_PRICE_ID ?? "",
    credits: 259,
    label: "Starter — 259 credits",
  },
} as const;

type Plan = keyof typeof PLANS;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { userId, plan = "starter" } = body as { userId?: string; plan?: string };

  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const planConfig = PLANS[plan as Plan];
  if (!planConfig) {
    return NextResponse.json({ error: `Unknown plan: ${plan}` }, { status: 400 });
  }
  if (!planConfig.priceId) {
    return NextResponse.json(
      { error: "STRIPE_STARTER_PRICE_ID is not configured" },
      { status: 500 }
    );
  }

  // Verify user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const appUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    line_items: [{ price: planConfig.priceId, quantity: 1 }],
    customer_email: user.email,
    success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/checkout/cancel`,
    metadata: {
      userId,
      plan,
      credits: String(planConfig.credits),
    },
  });

  return NextResponse.json({ url: session.url });
}
