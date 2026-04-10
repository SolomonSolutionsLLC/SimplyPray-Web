"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface SubscriptionInfo {
  tier: string;
  status: string;
  current_period_end: string | null;
  source: "individual" | "church";
  church_name?: string;
}

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  active: {
    label: "Active",
    className: "bg-green-100 text-green-800",
  },
  past_due: {
    label: "Past Due",
    className: "bg-yellow-100 text-yellow-800",
  },
  canceled: {
    label: "Canceled",
    className: "bg-red-100 text-red-800",
  },
  trialing: {
    label: "Trial",
    className: "bg-blue-100 text-blue-800",
  },
  incomplete: {
    label: "Incomplete",
    className: "bg-neutral-100 text-neutral-800",
  },
};

function StatusBadge({ status }: { status: string }) {
  const badge = STATUS_BADGES[status] || {
    label: status,
    className: "bg-neutral-100 text-neutral-600",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
    >
      {badge.label}
    </span>
  );
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTierName(tier: string): string {
  return tier
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function BillingPage() {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSubscription() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        // Check individual subscription
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("tier, status, current_period_end")
          .eq("user_id", user.id)
          .limit(1)
          .single();

        if (sub) {
          setSubscription({
            tier: sub.tier,
            status: sub.status,
            current_period_end: sub.current_period_end,
            source: "individual",
          });
          return;
        }

        // Check church subscription via ownership
        const { data: membership } = await supabase
          .from("church_members")
          .select("church_id")
          .eq("user_id", user.id)
          .eq("role", "owner")
          .eq("status", "active")
          .limit(1)
          .single();

        if (membership) {
          const { data: church } = await supabase
            .from("churches")
            .select("name, subscription_status, stripe_subscription_id")
            .eq("id", membership.church_id)
            .single();

          if (church?.stripe_subscription_id) {
            setSubscription({
              tier: "Church",
              status: church.subscription_status || "unknown",
              current_period_end: null,
              source: "church",
              church_name: church.name,
            });
            return;
          }
        }
      } catch (err) {
        console.error("Error fetching subscription:", err);
        setError("Failed to load subscription information.");
      } finally {
        setLoading(false);
      }
    }

    fetchSubscription();
  }, []);

  async function handleManageBilling() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to open billing portal.");
        return;
      }

      window.location.href = data.url;
    } catch {
      setError("Failed to open billing portal. Please try again.");
    } finally {
      setPortalLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-neutral-800">Billing</h1>
        <Card>
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-500" />
          </div>
        </Card>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-neutral-800">Billing</h1>
        <Card>
          <div className="py-8 text-center">
            <svg
              className="mx-auto h-12 w-12 text-neutral-300"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"
              />
            </svg>
            <h2 className="mt-4 text-lg font-semibold text-neutral-700">
              No Active Subscription
            </h2>
            <p className="mt-2 text-sm text-neutral-500">
              You don&apos;t have an active subscription yet. Choose a plan to
              get started.
            </p>
            <Link href="/pricing">
              <Button variant="primary" size="md" className="mt-6">
                View Plans
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-neutral-800">Billing</h1>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-neutral-700">
              Subscription Details
            </h2>
            <StatusBadge status={subscription.status} />
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                Plan
              </p>
              <p className="mt-1 text-base font-semibold text-neutral-800">
                {formatTierName(subscription.tier)}
              </p>
              {subscription.source === "church" &&
                subscription.church_name && (
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {subscription.church_name}
                  </p>
                )}
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                Status
              </p>
              <p className="mt-1 text-base font-semibold text-neutral-800">
                {STATUS_BADGES[subscription.status]?.label ||
                  subscription.status}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-400">
                Next Billing Date
              </p>
              <p className="mt-1 text-base font-semibold text-neutral-800">
                {formatDate(subscription.current_period_end)}
              </p>
            </div>
          </div>

          <div className="border-t border-neutral-100 pt-4">
            <Button
              variant="primary"
              size="md"
              onClick={handleManageBilling}
              disabled={portalLoading}
            >
              {portalLoading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Opening Portal...
                </>
              ) : (
                "Manage Billing"
              )}
            </Button>
            <p className="mt-2 text-xs text-neutral-400">
              Update payment method, view invoices, or cancel your subscription
              via Stripe.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
