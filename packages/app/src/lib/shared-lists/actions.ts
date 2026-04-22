"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function publishList(listId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("publish_list", { p_list_id: listId });
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/shared-lists");
  revalidatePath(`/dashboard/shared-lists/${listId}`);
}

export async function setListStatus(listId: string, status: "draft" | "archived") {
  const supabase = await createClient();
  const { error } = await supabase.from("shared_lists").update({ status }).eq("id", listId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/shared-lists");
  revalidatePath(`/dashboard/shared-lists/${listId}`);
}

export async function deleteList(listId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("shared_lists").delete().eq("id", listId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/shared-lists");
}

export async function updateList(listId: string, updates: {
  name?: string;
  description?: string | null;
  cadence?: string | null;
  write_mode?: "admin_only" | "member_submit";
  public_page?: boolean;
}) {
  const supabase = await createClient();
  const { error } = await supabase.from("shared_lists").update(updates).eq("id", listId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/shared-lists");
  revalidatePath(`/dashboard/shared-lists/${listId}`);
}

export async function createList(form: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthenticated");

  const { data: membership } = await supabase
    .from("church_members")
    .select("church_id,role")
    .eq("user_id", user.id)
    .in("role", ["owner", "admin"])
    .eq("status", "active")
    .limit(1)
    .single();
  if (!membership) throw new Error("no church");

  const name = String(form.get("name") ?? "").trim();
  if (!name) throw new Error("name required");
  const description = String(form.get("description") ?? "").trim() || null;
  const cadence = String(form.get("cadence") ?? "").trim() || null;
  const write_mode = form.get("write_mode") === "member_submit" ? "member_submit" : "admin_only";

  const { data, error } = await supabase.from("shared_lists").insert({
    scope: "church",
    church_id: membership.church_id,
    name, description, cadence, write_mode,
    created_by: user.id,
  }).select("id").single();

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/shared-lists");
  return data.id;
}

export async function addRequest(listId: string, form: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthenticated");

  const title = String(form.get("title") ?? "").trim();
  if (!title) throw new Error("title required");
  const body = String(form.get("body") ?? "").trim() || null;

  const { error } = await supabase.from("shared_requests").insert({
    list_id: listId,
    title, body,
    status: "active",
    submitted_by: user.id,
    moderated_by: user.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/shared-lists/${listId}`);
  revalidatePath(`/dashboard/shared-lists/${listId}/requests`);
}

export async function setRequestStatus(
  requestId: string,
  listId: string,
  status: "pending" | "active" | "answered" | "removed",
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthenticated");

  const updates: {
    status: typeof status;
    moderated_by: string;
    answered_at?: string | null;
  } = { status, moderated_by: user.id };
  if (status === "answered") updates.answered_at = new Date().toISOString();

  const { error } = await supabase.from("shared_requests").update(updates).eq("id", requestId);
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/shared-lists/${listId}`);
  revalidatePath(`/dashboard/shared-lists/${listId}/requests`);
}

export async function deleteRequest(requestId: string, listId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("shared_requests").delete().eq("id", requestId);
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/shared-lists/${listId}`);
  revalidatePath(`/dashboard/shared-lists/${listId}/requests`);
}
