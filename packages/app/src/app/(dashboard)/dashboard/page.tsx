import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatsPanel } from "@/components/dashboard/stats-panel";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
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
    redirect("/login?error=unauthorized");
  }

  const { data: church } = await supabase
    .from("churches")
    .select("id, name, slug, max_seats")
    .eq("id", membership.church_id)
    .single();

  if (!church) {
    redirect("/login?error=no-church");
  }

  const [
    { count: activeCount },
    { count: inactiveCount },
    { count: deactivatedCount },
    { data: sharedLists },
  ] = await Promise.all([
    supabase
      .from("church_members")
      .select("*", { count: "exact", head: true })
      .eq("church_id", church.id)
      .eq("status", "active"),
    supabase
      .from("church_members")
      .select("*", { count: "exact", head: true })
      .eq("church_id", church.id)
      .eq("status", "inactive"),
    supabase
      .from("church_members")
      .select("*", { count: "exact", head: true })
      .eq("church_id", church.id)
      .eq("status", "deactivated"),
    supabase
      .from("shared_lists")
      .select("id,name,status,created_at,published_at")
      .eq("church_id", church.id)
      .eq("scope", "church"),
  ]);

  const publishedLists = (sharedLists ?? []).filter((l) => l.status === "published");
  const listIds = publishedLists.map((l) => l.id);

  let activeRequests = 0;
  let answeredThisMonth = 0;
  let recentRequests: Array<{ id: string; title: string; list_id: string; status: string; created_at: string; answered_at: string | null }> = [];
  if (listIds.length > 0) {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const [{ count: ac }, { count: an }, { data: recent }] = await Promise.all([
      supabase
        .from("shared_requests")
        .select("*", { count: "exact", head: true })
        .in("list_id", listIds)
        .eq("status", "active"),
      supabase
        .from("shared_requests")
        .select("*", { count: "exact", head: true })
        .in("list_id", listIds)
        .eq("status", "answered")
        .gte("answered_at", monthStart.toISOString()),
      supabase
        .from("shared_requests")
        .select("id,title,list_id,status,created_at,answered_at")
        .in("list_id", listIds)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);
    activeRequests = ac ?? 0;
    answeredThisMonth = an ?? 0;
    recentRequests = recent ?? [];
  }

  const { data: inactive120 } = await supabase
    .from("church_members")
    .select("id,user_id,last_seen_at,joined_at,role")
    .eq("church_id", church.id)
    .eq("status", "active")
    .lt("last_seen_at", new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString())
    .order("last_seen_at", { ascending: true })
    .limit(4);

  const counts = {
    active: activeCount ?? 0,
    inactive: inactiveCount ?? 0,
    deactivated: deactivatedCount ?? 0,
    total: (activeCount ?? 0) + (inactiveCount ?? 0) + (deactivatedCount ?? 0),
  };

  return (
    <div className="space-y-8">
      <StatsPanel
        church={church}
        counts={counts}
        sharedStats={{
          lists: publishedLists.length,
          activeRequests,
          answeredThisMonth,
        }}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-card border border-sanctuary-hairline bg-white p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-2xl text-ink">Shared lists</h3>
            <Link href="/dashboard/shared-lists" className="btn-ghost">
              Manage
            </Link>
          </div>
          {publishedLists.length === 0 ? (
            <p className="text-sm text-ink-soft italic">No published lists yet.</p>
          ) : (
            <ul className="space-y-2">
              {publishedLists.slice(0, 5).map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-2">
                  <Link
                    href={`/dashboard/shared-lists/${l.id}`}
                    className="text-sm text-ink hover:text-primary-600"
                  >
                    {l.name}
                  </Link>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-ink-soft">
                    {l.published_at ? new Date(l.published_at).toLocaleDateString() : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-card border border-sanctuary-hairline bg-white p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-2xl text-ink">Recent requests</h3>
          </div>
          {recentRequests.length === 0 ? (
            <p className="text-sm text-ink-soft italic">Nothing recent.</p>
          ) : (
            <ul className="space-y-2">
              {recentRequests.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2">
                  <Link
                    href={`/dashboard/shared-lists/${r.list_id}/requests`}
                    className="text-sm text-ink hover:text-primary-600 truncate"
                  >
                    {r.title}
                  </Link>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-ink-soft">
                    {r.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-card border border-sanctuary-hairline bg-white p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-2xl text-ink">Inactive members (120+ days)</h3>
          <Link href="/dashboard/members?filter=inactive120" className="btn-ghost">
            View all
          </Link>
        </div>
        {(inactive120 ?? []).length === 0 ? (
          <p className="text-sm text-ink-soft italic">No one to worry about.</p>
        ) : (
          <ul className="space-y-2">
            {(inactive120 ?? []).map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-ink">{m.user_id.slice(0, 8)}…</span>
                <span className="font-mono text-[10px] uppercase tracking-wider text-ink-soft">
                  Last active{" "}
                  {m.last_seen_at ? new Date(m.last_seen_at).toLocaleDateString() : "—"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
