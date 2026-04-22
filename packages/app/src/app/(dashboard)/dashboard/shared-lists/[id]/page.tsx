import Link from "next/link";
import { redirect } from "next/navigation";
import { fetchListById, fetchListStats } from "@/lib/shared-lists/queries";
import {
  deleteList,
  publishList,
  setListStatus,
  updateList,
} from "@/lib/shared-lists/actions";

function pillClass(status: string) {
  if (status === "published") return "pill pill-live";
  if (status === "draft") return "pill pill-draft";
  if (status === "archived") return "pill pill-archived";
  return "pill";
}

export default async function SharedListEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const list = await fetchListById(id);
  const stats = await fetchListStats(id);

  async function save(formData: FormData) {
    "use server";
    const name = String(formData.get("name") ?? "").trim();
    if (!name) throw new Error("name required");
    await updateList(id, {
      name,
      description: String(formData.get("description") ?? "").trim() || null,
      cadence: String(formData.get("cadence") ?? "").trim() || null,
      write_mode:
        formData.get("write_mode") === "member_submit" ? "member_submit" : "admin_only",
      public_page: formData.get("public_page") === "on",
    });
  }

  async function doPublish() {
    "use server";
    await publishList(id);
  }
  async function toDraft() {
    "use server";
    await setListStatus(id, "draft");
  }
  async function toArchived() {
    "use server";
    await setListStatus(id, "archived");
  }
  async function doDelete() {
    "use server";
    await deleteList(id);
    redirect("/dashboard/shared-lists");
  }

  const inputCls =
    "w-full px-3.5 py-2.5 rounded-[10px] border border-sanctuary-hairline text-sm bg-white focus:border-primary-500 outline-none transition-colors";

  return (
    <div className="space-y-8 max-w-3xl">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-4xl text-ink tracking-tight">{list.name}</h1>
            <span className={pillClass(list.status)}>{list.status}</span>
          </div>
          <p className="text-sm text-ink-soft mt-1">
            Created {new Date(list.created_at).toLocaleDateString()}
            {list.published_at ? ` · Published ${new Date(list.published_at).toLocaleDateString()}` : ""}
          </p>
        </div>
        <Link href={`/dashboard/shared-lists/${id}/requests`} className="btn-outline">
          Manage requests →
        </Link>
      </header>

      <section className="grid grid-cols-3 gap-4">
        <Stat label="Subscribers" value={stats.subscriber_count} />
        <Stat label="Active requests" value={stats.active_requests} />
        <Stat label="Answered" value={stats.answered_count} />
      </section>

      <section className="rounded-card border border-sanctuary-hairline bg-white p-6 space-y-5">
        <h2 className="font-serif text-2xl text-ink">Details</h2>
        <form action={save} className="space-y-5">
          <Labeled label="Name">
            <input name="name" defaultValue={list.name} required className={inputCls} />
          </Labeled>
          <Labeled label="Description">
            <textarea
              name="description"
              defaultValue={list.description ?? ""}
              rows={4}
              className={inputCls}
            />
          </Labeled>
          <Labeled label="Cadence">
            <input name="cadence" defaultValue={list.cadence ?? ""} className={inputCls} />
          </Labeled>
          <fieldset className="space-y-2">
            <legend className="font-mono text-[10px] uppercase tracking-wider text-ink-soft">
              Who can add requests?
            </legend>
            <label className="flex gap-2 text-sm items-center">
              <input
                type="radio"
                name="write_mode"
                value="admin_only"
                defaultChecked={list.write_mode === "admin_only"}
              />{" "}
              Admins only
            </label>
            <label className="flex gap-2 text-sm items-center">
              <input
                type="radio"
                name="write_mode"
                value="member_submit"
                defaultChecked={list.write_mode === "member_submit"}
              />{" "}
              Members can submit (admins moderate)
            </label>
          </fieldset>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="public_page" defaultChecked={list.public_page} />
            Publish on public church page
          </label>
          <button type="submit" className="btn-primary">
            Save changes
          </button>
        </form>
      </section>

      <section className="rounded-card border border-sanctuary-hairline bg-white p-6 space-y-4">
        <h2 className="font-serif text-2xl text-ink">Status</h2>
        <div className="flex flex-wrap gap-3">
          {list.status === "draft" && (
            <form action={doPublish}>
              <button className="btn-primary">Publish</button>
            </form>
          )}
          {list.status === "published" && (
            <>
              <form action={toDraft}>
                <button className="btn-outline">Unpublish (back to draft)</button>
              </form>
              <form action={toArchived}>
                <button className="btn-outline">Archive</button>
              </form>
            </>
          )}
          {list.status === "archived" && (
            <form action={toDraft}>
              <button className="btn-outline">Restore to draft</button>
            </form>
          )}
        </div>
      </section>

      <section className="rounded-card border border-danger-pale bg-danger-pale/40 p-6 space-y-3">
        <h2 className="font-serif text-2xl text-ink">Danger zone</h2>
        <p className="text-sm text-ink-mid">
          Deleting removes the list and all its requests permanently.
        </p>
        <form action={doDelete}>
          <button className="btn-danger" type="submit">
            Delete list
          </button>
        </form>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-card border border-sanctuary-hairline bg-white p-5">
      <p className="font-mono text-[10px] uppercase tracking-wider text-ink-soft">{label}</p>
      <p className="mt-2 font-serif text-3xl text-ink">{value}</p>
    </div>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <label className="font-mono text-[10px] uppercase tracking-wider text-ink-soft">
        {label}
      </label>
      {children}
    </div>
  );
}
