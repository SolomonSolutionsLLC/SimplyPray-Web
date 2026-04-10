import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PricingSuccessPage() {
  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Green checkmark */}
        <div className="mx-auto mb-8 w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center">
          <svg
            className="w-10 h-10 text-primary-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-neutral-900 mb-3">
          You&apos;re all set!
        </h1>
        <p className="text-lg text-neutral-500 mb-10">
          Your SimplyPray subscription is active. Start deepening your prayer
          life today.
        </p>

        <div className="space-y-4">
          {/* Deep link placeholder — will be updated with actual scheme */}
          <a href="simplypray://" className="block">
            <Button variant="primary" size="lg" className="w-full">
              Open SimplyPray
            </Button>
          </a>

          <a
            href="https://apps.apple.com/app/simplypray"
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Button variant="outline" size="md" className="w-full">
              Download from App Store
            </Button>
          </a>

          <Link href="/" className="block">
            <Button variant="ghost" size="md" className="w-full">
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
