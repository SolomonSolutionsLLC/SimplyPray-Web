"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { BillingPeriod } from "./billing-toggle";

interface PricingCardProps {
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  billingPeriod: BillingPeriod;
  features: string[];
  highlighted?: boolean;
  cta: string;
  onSelect: () => void;
}

export function PricingCard({
  name,
  monthlyPrice,
  annualPrice,
  billingPeriod,
  features,
  highlighted = false,
  cta,
  onSelect,
}: PricingCardProps) {
  const price = billingPeriod === "monthly" ? monthlyPrice : annualPrice;
  const periodLabel = billingPeriod === "monthly" ? "/mo" : "/yr";
  const isFree = monthlyPrice === 0;

  return (
    <Card
      hover
      className={`relative flex flex-col p-8 ${
        highlighted
          ? "border-2 border-primary-500 shadow-card-hover scale-[1.02]"
          : "border border-neutral-200"
      }`}
    >
      {highlighted && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="bg-primary-500 text-white text-xs font-bold px-4 py-1.5 rounded-full">
            Most Popular
          </span>
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-lg font-semibold text-neutral-800 mb-2">{name}</h3>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-neutral-900">
            {isFree ? "Free" : `$${price.toFixed(2)}`}
          </span>
          {!isFree && (
            <span className="text-neutral-400 text-sm">{periodLabel}</span>
          )}
        </div>
        {!isFree && billingPeriod === "annual" && (
          <p className="text-xs text-primary-500 font-medium mt-1">
            ${(annualPrice / 12).toFixed(2)}/mo billed annually
          </p>
        )}
      </div>

      <ul className="flex-1 space-y-3 mb-8">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-sm text-neutral-600">
            <svg
              className="w-5 h-5 text-primary-500 shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {feature}
          </li>
        ))}
      </ul>

      <Button
        variant={highlighted ? "primary" : "outline"}
        size="md"
        className="w-full"
        onClick={onSelect}
      >
        {cta}
      </Button>
    </Card>
  );
}
