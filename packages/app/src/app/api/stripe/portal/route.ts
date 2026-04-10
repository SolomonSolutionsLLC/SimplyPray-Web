import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { createClient } from "@/lib/supabase/server";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Try individual subscription first
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .not("stripe_customer_id", "is", null)
      .limit(1)
      .single();

    let stripeCustomerId = subscription?.stripe_customer_id;

    // If no individual subscription, check church ownership
    if (!stripeCustomerId) {
      const { data: churchOwnership } = await supabase
        .from("church_members")
        .select("church_id")
        .eq("user_id", user.id)
        .eq("role", "owner")
        .eq("status", "active")
        .limit(1)
        .single();

      if (churchOwnership) {
        const { data: church } = await supabase
          .from("churches")
          .select("stripe_customer_id")
          .eq("id", churchOwnership.church_id)
          .not("stripe_customer_id", "is", null)
          .single();

        stripeCustomerId = church?.stripe_customer_id;
      }
    }

    if (!stripeCustomerId) {
      return NextResponse.json(
        {
          error:
            "No billing account found. Please subscribe to a plan first.",
        },
        { status: 404 }
      );
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${APP_URL}/dashboard/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Stripe billing portal error:", error);
    return NextResponse.json(
      { error: "Failed to create billing portal session" },
      { status: 500 }
    );
  }
}
