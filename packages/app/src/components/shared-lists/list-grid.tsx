import Link from "next/link";

type List = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  cadence: string | null;
};

function pillClass(status: string) {
  if (status === "published") return "pill pill-live";
  if (status === "draft") return "pill pill-draft";
  if (status === "archived") return "pill pill-archived";
  return "pill";
}

export function ListGrid({ lists }: { lists: List[] }) {
  if (lists.length === 0) {
    return (
      <div className="rounded-card border border-sanctuary-hairline bg-white p-8 text-center">
        <p className="text-ink-soft">No lists here yet.</p>
      </div>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {lists.map((l) => (
        <article
          key={l.id}
          className="rounded-card border border-sanctuary-hairline bg-white p-6 flex flex-col gap-3.5 hover:border-primary-500 transition-colors"
        >
          <div className="flex items-start justify-between gap-3">
            <h4 className="font-serif text-2xl tracking-tight text-ink">{l.name}</h4>
            <span className={pillClass(l.status)}>{l.status}</span>
          </div>
          {l.description && (
            <p className="text-[13px] text-ink-mid font-light leading-relaxed">{l.description}</p>
          )}
          <div className="flex justify-between items-center mt-auto pt-3.5 border-t border-sanctuary-hairline">
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-soft">
              {l.cadence ?? "Ongoing"}
            </span>
            <Link href={`/dashboard/shared-lists/${l.id}`} className="btn-ghost">
              Manage
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}
