import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

export const dynamic = "force-dynamic";

// Supabase admin client (service role) to bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Maps Stripe price IDs to SimplyPray subscription tiers.
 * Replace placeholder IDs with actual Stripe price IDs once created.
 */
function getTierFromPriceId(priceId: string): string {
  const tierMap: Record<string, string> = {
    price_personal_monthly: "personal",
    price_personal_annual: "personal",
    price_community_monthly: "community",
    price_community_annual: "community",
  };
  return tierMap[priceId] ?? "free";
}

/**
 * Converts a Stripe subscription status to our internal status values.
 */
function mapSubscriptionStatus(
  stripeStatus: Stripe.Subscription.Status
): string {
  const statusMap: Record<string, string> = {
    active: "active",
    past_due: "past_due",
    canceled: "canceled",
    trialing: "trialing",
    unpaid: "past_due",
    incomplete: "past_due",
    incomplete_expired: "canceled",
    paused: "canceled",
  };
  return statusMap[stripeStatus] ?? "canceled";
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  const userId = session.client_reference_id;
  const subscriptionId = session.subscription as string;

  if (!userId || !subscriptionId) {
    console.warn(
      "[webhook] checkout.session.completed missing userId or subscriptionId",
      { userId, subscriptionId }
    );
    return;
  }

  // Retrieve the full subscription to get price/tier info
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const item = subscription.items.data[0];
  const priceId = item?.price.id ?? "";
  const tier = getTierFromPriceId(priceId);
  const periodEnd = item?.current_period_end;

  const { error } = await supabaseAdmin.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: subscription.customer as string,
      stripe_subscription_id: subscriptionId,
      tier,
      status: "active",
      current_period_end: periodEnd
        ? new Date(periodEnd * 1000).toISOString()
        : null,
    },
    { onConflict: "user_id" }
  );

  if (error) {
    console.error("[webhook] Failed to upsert subscription:", error);
    throw error;
  }

  console.log(
    `[webhook] checkout.session.completed — user=${userId} tier=${tier}`
  );
}

async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
): Promise<void> {
  const item = subscription.items.data[0];
  const priceId = item?.price.id ?? "";
  const tier = getTierFromPriceId(priceId);
  const status = mapSubscriptionStatus(subscription.status);
  const periodEnd = item?.current_period_end;

  const { error } = await supabaseAdmin
    .from("subscriptions")
    .update({
      tier,
      status,
      current_period_end: periodEnd
        ? new Date(periodEnd * 1000).toISOString()
        : null,
    })
    .eq("stripe_subscription_id", subscription.id);

  if (error) {
    console.error("[webhook] Failed to update subscription:", error);
    throw error;
  }

  console.log(
    `[webhook] customer.subscription.updated — sub=${subscription.id} status=${status} tier=${tier}`
  );
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("subscriptions")
    .update({ status: "canceled" })
    .eq("stripe_subscription_id", subscription.id);

  if (error) {
    console.error("[webhook] Failed to cancel subscription:", error);
    throw error;
  }

  console.log(
    `[webhook] customer.subscription.deleted — sub=${subscription.id}`
  );
}

async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice
): Promise<void> {
  const subscriptionId =
    (invoice.parent?.subscription_details?.subscription as string | null) ??
    (invoice.lines.data[0]?.subscription as string | null) ??
    null;

  if (!subscriptionId) {
    console.warn("[webhook] invoice.payment_failed — no subscription ID");
    return;
  }

  const { error } = await supabaseAdmin
    .from("subscriptions")
    .update({ status: "past_due" })
    .eq("stripe_subscription_id", subscriptionId);

  if (error) {
    console.error(
      "[webhook] Failed to mark subscription as past_due:",
      error
    );
    throw error;
  }

  console.log(
    `[webhook] invoice.payment_failed — sub=${subscriptionId} → past_due`
  );
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    console.error("[webhook] Missing stripe-signature header");
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[webhook] Signature verification failed: ${message}`);
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;

      case "customer.subscription.updated":
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription
        );
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        );
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(
          event.data.object as Stripe.Invoice
        );
        break;

      default:
        console.log(`[webhook] Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[webhook] Error processing ${event.type}: ${message}`);
    // Return 200 to prevent Stripe from retrying — the error is logged
    // and likely a database issue that won't resolve on retry
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
