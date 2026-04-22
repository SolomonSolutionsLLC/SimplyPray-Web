import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fetchListsForChurch } from "@/lib/shared-lists/queries";
import { ListGrid } from "@/components/shared-lists/list-grid";

type Tab = "published" | "draft" | "archived";

export default async function SharedListsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("church_members")
    .select("church_id,role")
    .eq("user_id", user.id)
    .in("role", ["owner", "admin"])
    .eq("status", "active")
    .limit(1)
    .single();
  if (!membership) redirect("/login?error=unauthorized");

  const lists = await fetchListsForChurch(membership.church_id);
  const { tab: tabParam } = await searchParams;
  const tab: Tab =
    tabParam === "draft" || tabParam === "archived" ? tabParam : "published";
  const filtered = lists.filter((l) => l.status === tab);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-6 flex-wrap">
        <div>
          <h1 className="font-serif text-4xl text-ink tracking-tight">Shared Lists</h1>
          <p className="text-sm text-ink-soft mt-1">
            Public prayer chains the whole congregation can follow.
          </p>
        </div>
        <Link href="/dashboard/shared-lists/new" className="btn-primary">
          ＋ New shared list
        </Link>
      </header>

      <nav className="flex gap-1 border-b border-sanctuary-hairline">
        {(["published", "draft", "archived"] as const).map((t) => {
          const count = lists.filter((l) => l.status === t).length;
          const active = t === tab;
          return (
            <Link
              key={t}
              href={`?tab=${t}`}
              className={`px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider -mb-px border-b-2 ${
                active
                  ? "text-primary-600 border-primary-600"
                  : "text-ink-soft border-transparent hover:text-primary-600"
              }`}
            >
              {t === "published" ? "Published" : t === "draft" ? "Drafts" : "Archived"}
              <span className="ml-1.5 px-1.5 py-[1px] rounded-pill bg-sanctuary-bg text-[10px]">
                {count}
              </span>
            </Link>
          );
        })}
      </nav>

      <ListGrid lists={filtered} />
    </div>
  );
}
