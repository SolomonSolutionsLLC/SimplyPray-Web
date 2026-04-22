"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ChurchSettings {
  id: string;
  name: string;
  landing_page_message: string | null;
  primary_color: string | null;
  logo_url: string | null;
  default_list_write_mode: string;
  public_lists_enabled: boolean;
}

export default function SettingsPage() {
  const supabase = createClient();
  const router = useRouter();

  const [church, setChurch] = useState<ChurchSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#3A6F63");
  const [logoUrl, setLogoUrl] = useState("");
  const [defaultWriteMode, setDefaultWriteMode] = useState<"admin_only" | "member_submit">(
    "admin_only"
  );
  const [publicListsEnabled, setPublicListsEnabled] = useState(false);

  useEffect(() => {
    async function loadChurch() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: membership } = await supabase
        .from("church_members")
        .select("church_id")
        .eq("user_id", user.id)
        .in("role", ["owner", "admin"])
        .eq("status", "active")
        .limit(1)
        .single();

      if (!membership) {
        router.push("/login?error=unauthorized");
        return;
      }

      const { data: churchData } = await supabase
        .from("churches")
        .select(
          "id, name, landing_page_message, primary_color, logo_url, default_list_write_mode, public_lists_enabled"
        )
        .eq("id", membership.church_id)
        .single();

      if (churchData) {
        setChurch(churchData);
        setName(churchData.name);
        setMessage(churchData.landing_page_message ?? "");
        setPrimaryColor(churchData.primary_color ?? "#3A6F63");
        setLogoUrl(churchData.logo_url ?? "");
        setDefaultWriteMode(
          churchData.default_list_write_mode === "member_submit"
            ? "member_submit"
            : "admin_only"
        );
        setPublicListsEnabled(Boolean(churchData.public_lists_enabled));
      }

      setLoading(false);
    }

    loadChurch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (!church) return;

    setSaving(true);
    setToast(null);

    const { error } = await supabase
      .from("churches")
      .update({
        name,
        landing_page_message: message || null,
        primary_color: primaryColor || null,
        logo_url: logoUrl || null,
        default_list_write_mode: defaultWriteMode,
        public_lists_enabled: publicListsEnabled,
      })
      .eq("id", church.id);

    setSaving(false);

    if (error) {
      setToast({ type: "error", message: "Failed to save settings. Please try again." });
    } else {
      setToast({ type: "success", message: "Settings saved successfully." });
      // Auto-dismiss toast
      setTimeout(() => setToast(null), 3000);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-48 animate-pulse rounded bg-neutral-200" />
          <div className="mt-2 h-4 w-64 animate-pulse rounded bg-neutral-200" />
        </div>
        <Card>
          <div className="space-y-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-24 animate-pulse rounded bg-neutral-200" />
                <div className="h-10 w-full animate-pulse rounded-2xl bg-neutral-200" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-800">
          Church Settings
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Update your church profile and landing page details
        </p>
      </div>

      {/* Toast notification */}
      {toast && (
        <div
          className={`rounded-xl px-4 py-3 text-sm font-medium ${
            toast.type === "success"
              ? "bg-primary-50 text-primary-600"
              : "bg-red-50 text-red-600"
          }`}
        >
          {toast.message}
        </div>
      )}

      <Card>
        <form onSubmit={handleSave} className="space-y-6">
          <Input
            label="Church Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter church name"
            required
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-600">
              Landing Page Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Welcome message shown on your church's landing page..."
              rows={4}
              className="w-full rounded-2xl border border-neutral-200 px-4 py-3 text-neutral-800 placeholder:text-neutral-400 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-300 transition-colors duration-200"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-600">
              Primary Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-10 w-10 cursor-pointer rounded-lg border border-neutral-200"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#3A6F63"
                pattern="^#[0-9A-Fa-f]{6}$"
                className="w-32 rounded-2xl border border-neutral-200 px-4 py-3 text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-300 transition-colors duration-200"
              />
            </div>
          </div>

          <Input
            label="Logo URL"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://example.com/logo.png"
            type="url"
          />

          <div className="pt-4 border-t border-sanctuary-hairline space-y-4">
            <h3 className="font-serif text-xl text-ink">Shared list defaults</h3>
            <fieldset className="space-y-2">
              <legend className="font-mono text-[10px] uppercase tracking-wider text-ink-soft">
                Who can add requests by default?
              </legend>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="default_write"
                  checked={defaultWriteMode === "admin_only"}
                  onChange={() => setDefaultWriteMode("admin_only")}
                />{" "}
                Admins only
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="default_write"
                  checked={defaultWriteMode === "member_submit"}
                  onChange={() => setDefaultWriteMode("member_submit")}
                />{" "}
                Members can submit (admins moderate)
              </label>
            </fieldset>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={publicListsEnabled}
                onChange={(e) => setPublicListsEnabled(e.target.checked)}
              />
              Enable public church page (lists marked public show to anonymous visitors)
            </label>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
