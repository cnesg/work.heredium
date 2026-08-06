import { supabase } from "./supabase";

export const BUCKET = "heredium-files";

function sanitize(name) {
  // Supabase storage keys are safest as ASCII — transliterate anything else
  const ext = name.includes(".") ? "." + name.split(".").pop().toLowerCase() : "";
  const base = name.slice(0, name.length - ext.length);
  const safeBase = base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 40) || "file";
  return safeBase + ext.replace(/[^a-zA-Z0-9.]/g, "");
}

// Returns { path, url } on success, or { error } with the real message on failure
export async function uploadFile(prefix, file) {
  if (!supabase) {
    return { error: "Supabase가 연결되지 않았어요 (환경변수 확인 필요)" };
  }
  const path = `${prefix}/${Date.now()}-${sanitize(file.name)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || undefined,
  });
  if (error) {
    return { error: error.message || JSON.stringify(error) };
  }
  return { path, url: getPublicUrl(path) };
}

export function getPublicUrl(path) {
  if (!supabase) return null;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data?.publicUrl || null;
}

export async function listFiles(prefix) {
  if (!supabase) return [];
  const { data, error } = await supabase.storage.from(BUCKET).list(prefix, {
    limit: 100,
    sortBy: { column: "created_at", order: "desc" },
  });
  if (error || !data) return [];
  return data
    .filter((f) => f.id)
    .map((f) => ({
      name: f.name,
      path: `${prefix}/${f.name}`,
      url: getPublicUrl(`${prefix}/${f.name}`),
      size: f.metadata?.size,
    }));
}

export async function deleteFile(path) {
  if (!supabase) return false;
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  return !error;
}
