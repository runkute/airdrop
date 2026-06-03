import { NextRequest, NextResponse } from "next/server";
import { stripe, CREDIT_PACKAGES } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

// Next.js App Router does not pre-parse the body for Route Handlers,
// so req.text() returns the raw payload Stripe needs for signature verification.
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature") ?? "";
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? "";

  let event: ReturnType<typeof stripe.webhooks.constructEvent>;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    console.error("[stripe-webhook] signature verification failed:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    // We encode credits at checkout-session creation time so the webhook
    // doesn't need to look up the price ID.
    const userId = session.metadata?.userId;
    const creditsRaw = session.metadata?.credits;

    if (!userId || !creditsRaw) {
      console.warn("[stripe-webhook] session missing metadata:", session.id);
      return NextResponse.json({ received: true });
    }

    const credits = parseInt(creditsRaw, 10);
    if (isNaN(credits) || credits <= 0) {
      console.warn("[stripe-webhook] invalid credits value:", creditsRaw);
      return NextResponse.json({ received: true });
    }

    await prisma.userCredits.upsert({
      where: { userId },
      create: { userId, balance: credits },
      update: { balance: { increment: credits } },
    });

    console.log(
      `[stripe-webhook] +${credits} credits → user ${userId} (session ${session.id})`
    );
  }

  return NextResponse.json({ received: true });
}
