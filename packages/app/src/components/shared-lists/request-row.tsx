import { setRequestStatus, deleteRequest } from "@/lib/shared-lists/actions";

type Request = {
  id: string;
  title: string;
  body: string | null;
  status: string;
  submitted_by: string;
  answered_at: string | null;
  created_at: string;
};

function pillClass(status: string) {
  if (status === "active") return "pill pill-live";
  if (status === "answered") return "pill";
  if (status === "pending") return "pill pill-draft";
  return "pill pill-archived";
}

export function RequestRow({ request, listId }: { request: Request; listId: string }) {
  async function approve() {
    "use server";
    await setRequestStatus(request.id, listId, "active");
  }
  async function answered() {
    "use server";
    await setRequestStatus(request.id, listId, "answered");
  }
  async function remove() {
    "use server";
    await setRequestStatus(request.id, listId, "removed");
  }
  async function hardDelete() {
    "use server";
    await deleteRequest(request.id, listId);
  }

  return (
    <article className="rounded-card border border-sanctuary-hairline bg-white p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-serif text-lg text-ink">{request.title}</h3>
        <span className={pillClass(request.status)}>{request.status}</span>
      </div>
      {request.body && <p className="text-sm text-ink-mid leading-relaxed">{request.body}</p>}
      <p className="font-mono text-[10px] uppercase tracking-wider text-ink-soft">
        {new Date(request.created_at).toLocaleString()}
        {request.answered_at
          ? ` · answered ${new Date(request.answered_at).toLocaleDateString()}`
          : ""}
      </p>
      <div className="flex flex-wrap gap-2">
        {request.status === "pending" && (
          <>
            <form action={approve}>
              <button className="btn-ghost">Approve</button>
            </form>
            <form action={remove}>
              <button className="btn-ghost">Remove</button>
            </form>
          </>
        )}
        {request.status === "active" && (
          <>
            <form action={answered}>
              <button className="btn-ghost">Mark answered</button>
            </form>
            <form action={remove}>
              <button className="btn-ghost">Remove</button>
            </form>
          </>
        )}
        {request.status === "answered" && (
          <form action={remove}>
            <button className="btn-ghost">Remove</button>
          </form>
        )}
        {request.status === "removed" && (
          <form action={hardDelete}>
            <button className="btn-ghost">Delete permanently</button>
          </form>
        )}
      </div>
    </article>
  );
}
