import Link from "next/link";
import { Card } from "@/components/ui/card";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata = {
  title: "Create your SimplyPray account",
  description: "Sign up for SimplyPray to manage your church group subscription.",
};

export default function SignupPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="w-full max-w-md flex flex-col items-center gap-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary-500 tracking-tight">
            SimplyPray
          </h1>
          <p className="mt-2 text-neutral-500 text-sm">
            Devotional prayer, made simple
          </p>
        </div>

        <Card className="w-full p-8">
          <h2 className="text-xl font-semibold text-neutral-800 text-center mb-6">
            Create your SimplyPray account
          </h2>
          <AuthForm mode="signup" />
        </Card>

        <p className="text-sm text-neutral-500">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-primary-500 font-medium hover:text-primary-600 transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
