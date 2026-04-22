import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: church } = await supabase
    .from("churches")
    .select("name,public_lists_enabled")
    .eq("slug", slug)
    .single();
  if (!church || !church.public_lists_enabled) {
    return { title: "Not found" };
  }
  return {
    title: `Prayer lists at ${church.name}`,
    description: `Follow along with what ${church.name} is praying for.`,
  };
}

export default async function PublicSharedListsPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: church } = await supabase
    .from("churches")
    .select("id,name,slug,public_lists_enabled,landing_page_message")
    .eq("slug", slug)
    .single();
  if (!church || !church.public_lists_enabled) notFound();

  const { data: lists } = await supabase
    .from("shared_lists")
    .select("id,name,description,cadence,published_at")
    .eq("church_id", church.id)
    .eq("status", "published")
    .eq("public_page", true)
    .order("published_at", { ascending: false });

  const listIds = (lists ?? []).map((l) => l.id);
  let requestsByList: Record<string, Array<{ id: string; title: string; body: string | null; status: string; answered_at: string | null }>> = {};
  if (listIds.length > 0) {
    const { data: reqs } = await supabase
      .from("shared_requests")
      .select("id,list_id,title,body,status,answered_at,created_at")
      .in("list_id", listIds)
      .in("status", ["active", "answered"])
      .order("created_at", { ascending: false });
    requestsByList = (reqs ?? []).reduce(
      (acc, r) => {
        (acc[r.list_id] ??= []).push(r);
        return acc;
      },
      {} as typeof requestsByList
    );
  }

  return (
    <div className="min-h-screen bg-sanctuary-bg">
      <div className="mx-auto max-w-3xl px-6 py-12 space-y-10">
        <header className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-soft">
            Prayer at
          </p>
          <h1 className="font-serif text-5xl text-ink tracking-tight">{church.name}</h1>
          {church.landing_page_message && (
            <p className="text-ink-mid leading-relaxed">{church.landing_page_message}</p>
          )}
        </header>

        {(lists ?? []).length === 0 ? (
          <p className="text-ink-soft italic">No public lists yet.</p>
        ) : (
          (lists ?? []).map((l) => (
            <section
              key={l.id}
              className="rounded-card border border-sanctuary-hairline bg-white p-6 space-y-4"
            >
              <div>
                <h2 className="font-serif text-3xl text-ink">{l.name}</h2>
                {l.description && (
                  <p className="text-sm text-ink-mid mt-1 leading-relaxed">{l.description}</p>
                )}
                <p className="font-mono text-[10px] uppercase tracking-wider text-ink-soft mt-2">
                  {l.cadence ?? "Ongoing"}
                </p>
              </div>
              <ul className="space-y-3">
                {(requestsByList[l.id] ?? []).map((r) => (
                  <li
                    key={r.id}
                    className="border-t border-sanctuary-hairline pt-3 first:border-t-0 first:pt-0"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium text-ink">{r.title}</p>
                      {r.status === "answered" && (
                        <span className="pill">Answered</span>
                      )}
                    </div>
                    {r.body && (
                      <p className="text-sm text-ink-mid mt-1 leading-relaxed">{r.body}</p>
                    )}
                  </li>
                ))}
                {(requestsByList[l.id] ?? []).length === 0 && (
                  <li className="text-sm text-ink-soft italic">No active requests.</li>
                )}
              </ul>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
