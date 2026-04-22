import { createClient } from "@/lib/supabase/server";

export async function fetchListsForChurch(churchId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shared_lists")
    .select("id,name,description,status,write_mode,cadence,public_page,created_at,published_at")
    .eq("scope", "church")
    .eq("church_id", churchId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchListById(listId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shared_lists")
    .select("*")
    .eq("id", listId)
    .single();
  if (error) throw error;
  return data;
}

export async function fetchListStats(listId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_shared_list_stats", { p_list_id: listId });
  if (error) throw error;
  return data?.[0] ?? { subscriber_count: 0, active_requests: 0, answered_count: 0 };
}

export async function fetchRequestsForList(listId: string, opts: { statuses?: string[] } = {}) {
  const supabase = await createClient();
  let q = supabase
    .from("shared_requests")
    .select("id,title,body,status,submitted_by,moderated_by,answered_at,created_at,updated_at")
    .eq("list_id", listId)
    .order("created_at", { ascending: false });
  if (opts.statuses && opts.statuses.length > 0) q = q.in("status", opts.statuses);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}
