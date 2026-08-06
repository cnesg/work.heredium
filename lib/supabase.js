import { createClient } from "@supabase/supabase-js";

// trim whitespace and any trailing slash — a trailing "/" makes the SDK build
// URLs like https://x.supabase.co//storage/... which Supabase rejects with
// "Invalid path specified in request URL"
const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/\/+$/, "");
const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();

function isValidUrl(s) {
  try { return Boolean(new URL(s)); } catch { return false; }
}

// null when env vars aren't set — callers handle gracefully
export const supabase =
  url && anonKey && isValidUrl(url) ? createClient(url, anonKey) : null;

export async function loadSection(projectId, section, fallback = {}) {
  if (!supabase) return fallback;
  const { data, error } = await supabase
    .from("heredium_data")
    .select("payload")
    .eq("project_id", projectId)
    .eq("section", section)
    .maybeSingle();
  if (error) {
    if (typeof window !== "undefined") {
      console.error("[heredium] loadSection error:", error);
      window.__heredium_last_error = error.message;
    }
    return fallback;
  }
  if (!data) return fallback;
  return { ...fallback, ...data.payload };
}

export async function saveSection(projectId, section, payload) {
  if (!supabase) return { ok: false, error: "Supabase 미연결 (환경변수 확인)" };
  const { error } = await supabase.from("heredium_data").upsert(
    {
      project_id: projectId,
      section,
      payload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "project_id,section" }
  );
  if (error) {
    return { ok: false, error: error.message || JSON.stringify(error) };
  }
  return { ok: true };
}

export async function loadAllSections(projectIds, section) {
  if (!supabase || projectIds.length === 0) return {};
  const { data, error } = await supabase
    .from("heredium_data")
    .select("project_id, payload")
    .in("project_id", projectIds)
    .eq("section", section);
  if (error || !data) return {};
  return Object.fromEntries(data.map((d) => [d.project_id, d.payload]));
}
