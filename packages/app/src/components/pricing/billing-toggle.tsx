"use client";

export type BillingPeriod = "monthly" | "annual";

interface BillingToggleProps {
  period: BillingPeriod;
  onToggle: (period: BillingPeriod) => void;
}

export function BillingToggle({ period, onToggle }: BillingToggleProps) {
  return (
    <div className="flex items-center justify-center gap-3">
      <button
        onClick={() => onToggle("monthly")}
        className={`px-5 py-2.5 rounded-button text-sm font-semibold transition-colors duration-200 ${
          period === "monthly"
            ? "bg-primary-500 text-white"
            : "text-neutral-500 hover:text-neutral-700"
        }`}
      >
        Monthly
      </button>

      <button
        onClick={() => onToggle("annual")}
        className={`px-5 py-2.5 rounded-button text-sm font-semibold transition-colors duration-200 flex items-center gap-2 ${
          period === "annual"
            ? "bg-primary-500 text-white"
            : "text-neutral-500 hover:text-neutral-700"
        }`}
      >
        Annual
        <span
          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            period === "annual"
              ? "bg-white/20 text-white"
              : "bg-primary-100 text-primary-600"
          }`}
        >
          Save 30%
        </span>
      </button>
    </div>
  );
}
