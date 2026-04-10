"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BillingToggle, type BillingPeriod } from "@/components/pricing/billing-toggle";
import { PricingCard } from "@/components/pricing/pricing-card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

// Placeholder Stripe price IDs — configure in Stripe dashboard later
const PRICE_IDS = {
  personal_monthly: "price_personal_monthly",
  personal_annual: "price_personal_annual",
  community_monthly: "price_community_monthly",
  community_annual: "price_community_annual",
};

const TIERS = [
  {
    name: "Free",
    monthlyPrice: 0,
    annualPrice: 0,
    features: [
      "Basic prayer journaling",
      "1 prayer list",
      "Daily verse",
    ],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Personal",
    monthlyPrice: 2.99,
    annualPrice: 24.99,
    features: [
      "Unlimited prayer lists",
      "ACTS prayer framework",
      "Daily reminders",
      "Prayer history & insights",
      "Export your prayers",
    ],
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    name: "Community",
    monthlyPrice: 6.99,
    annualPrice: 54.99,
    features: [
      "Everything in Personal",
      "Prayer groups",
      "Shared prayer lists",
      "Church content access",
      "Community prayer wall",
      "Priority support",
    ],
    cta: "Start Free Trial",
    highlighted: false,
  },
];

const FAQ_ITEMS = [
  {
    question: "Can I switch plans later?",
    answer:
      "Absolutely. You can upgrade, downgrade, or cancel at any time from your account settings. Changes take effect at the start of your next billing cycle.",
  },
  {
    question: "Is there a free trial?",
    answer:
      "Yes! Both Personal and Community plans come with a 7-day free trial. You won't be charged until the trial ends.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept all major credit and debit cards through our secure payment provider, Stripe.",
  },
  {
    question: "Can I get a refund?",
    answer:
      "If you're not satisfied within the first 30 days, contact us at support@simplypray.io for a full refund.",
  },
  {
    question: "What happens to my data if I cancel?",
    answer:
      "Your prayers and data remain yours. If you cancel, you'll retain read-only access. You can export your data at any time.",
  },
];

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");
  const [loading, setLoading] = useState<string | null>(null);
  const router = useRouter();

  async function handleSelectTier(tierName: string) {
    if (tierName === "Free") {
      router.push("/signup");
      return;
    }

    setLoading(tierName);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push(`/signup?next=/pricing`);
        return;
      }

      const key = tierName.toLowerCase() as "personal" | "community";
      const priceId =
        billingPeriod === "monthly"
          ? PRICE_IDS[`${key}_monthly`]
          : PRICE_IDS[`${key}_annual`];

      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId,
          userId: user.id,
          email: user.email,
        }),
      });

      const { url, error } = await response.json();

      if (error) {
        console.error("Checkout error:", error);
        return;
      }

      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error("Failed to start checkout:", error);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Hero */}
      <section className="pt-20 pb-4 text-center px-4">
        <h1 className="text-4xl md:text-5xl font-bold text-neutral-900 mb-4">
          Choose your plan
        </h1>
        <p className="text-lg text-neutral-500 max-w-xl mx-auto mb-10">
          Deepen your prayer life with the tools and community you need. Start free, upgrade when you&apos;re ready.
        </p>
        <BillingToggle period={billingPeriod} onToggle={setBillingPeriod} />
      </section>

      {/* Pricing cards */}
      <section className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-8 items-start">
          {TIERS.map((tier) => (
            <PricingCard
              key={tier.name}
              name={tier.name}
              monthlyPrice={tier.monthlyPrice}
              annualPrice={tier.annualPrice}
              billingPeriod={billingPeriod}
              features={tier.features}
              highlighted={tier.highlighted}
              cta={loading === tier.name ? "Loading..." : tier.cta}
              onSelect={() => handleSelectTier(tier.name)}
            />
          ))}
        </div>
      </section>

      {/* Church banner */}
      <section className="max-w-5xl mx-auto px-4 pb-16">
        <div className="bg-primary-50 border border-primary-200 rounded-card p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold text-primary-700 mb-2">
              Churches
            </h2>
            <p className="text-primary-600 max-w-lg">
              Sponsor your congregation&apos;s prayer life. Branded landing page, admin dashboard, and member management starting at $49/mo.
            </p>
          </div>
          <Button
            variant="primary"
            size="lg"
            className="shrink-0"
            onClick={() => {
              window.location.href = "mailto:support@simplypray.io?subject=Church%20Subscription%20Inquiry";
            }}
          >
            Contact Us
          </Button>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 pb-24">
        <h2 className="text-3xl font-bold text-neutral-900 text-center mb-12">
          Frequently asked questions
        </h2>
        <div className="space-y-6">
          {FAQ_ITEMS.map((item) => (
            <div
              key={item.question}
              className="bg-white rounded-card p-6 shadow-card"
            >
              <h3 className="text-base font-semibold text-neutral-800 mb-2">
                {item.question}
              </h3>
              <p className="text-sm text-neutral-500 leading-relaxed">
                {item.answer}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
