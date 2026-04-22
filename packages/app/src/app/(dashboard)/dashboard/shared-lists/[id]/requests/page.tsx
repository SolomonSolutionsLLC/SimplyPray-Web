import Link from "next/link";
import { fetchListById, fetchRequestsForList } from "@/lib/shared-lists/queries";
import { addRequest } from "@/lib/shared-lists/actions";
import { RequestRow } from "@/components/shared-lists/request-row";

type Tab = "pending" | "active" | "answered" | "removed";

export default async function RequestsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab: tabParam } = await searchParams;
  const tab: Tab =
    tabParam === "pending" || tabParam === "answered" || tabParam === "removed"
      ? tabParam
      : "active";

  const [list, all] = await Promise.all([
    fetchListById(id),
    fetchRequestsForList(id, { statuses: ["pending", "active", "answered", "removed"] }),
  ]);
  const counts = {
    pending: all.filter((r) => r.status === "pending").length,
    active: all.filter((r) => r.status === "active").length,
    answered: all.filter((r) => r.status === "answered").length,
    removed: all.filter((r) => r.status === "removed").length,
  };
  const filtered = all.filter((r) => r.status === tab);

  async function quickAdd(formData: FormData) {
    "use server";
    await addRequest(id, formData);
  }

  const inputCls =
    "w-full px-3.5 py-2.5 rounded-[10px] border border-sanctuary-hairline text-sm bg-white focus:border-primary-500 outline-none transition-colors";

  return (
    <div className="space-y-6 max-w-3xl">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-4xl text-ink tracking-tight">{list.name} · Requests</h1>
          <p className="text-sm text-ink-soft mt-1">Moderate and answer prayer requests.</p>
        </div>
        <Link href={`/dashboard/shared-lists/${id}`} className="btn-ghost">
          ← Back to list
        </Link>
      </header>

      <section className="rounded-card border border-sanctuary-hairline bg-white p-5 space-y-3">
        <h2 className="font-serif text-xl text-ink">Add request</h2>
        <form action={quickAdd} className="space-y-3">
          <input name="title" required placeholder="Title" className={inputCls} />
          <textarea name="body" rows={3} placeholder="Details (optional)" className={inputCls} />
          <button type="submit" className="btn-primary">
            Add to list
          </button>
        </form>
      </section>

      <nav className="flex gap-1 border-b border-sanctuary-hairline">
        {(["pending", "active", "answered", "removed"] as const).map((t) => {
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
              {t}
              <span className="ml-1.5 px-1.5 py-[1px] rounded-pill bg-sanctuary-bg text-[10px]">
                {counts[t]}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <p className="text-ink-soft italic">None here.</p>
        ) : (
          filtered.map((r) => <RequestRow key={r.id} request={r} listId={id} />)
        )}
      </div>
    </div>
  );
}
