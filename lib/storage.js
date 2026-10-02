// localStorage-backed "saved recipes" — no backend/account, per the product
// spec. All functions are safe to call during SSR (return empty/no-op).

const KEY = "cooklab:saved-recipes";

function readAll() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(records) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(records));
  } catch {
    // storage full or unavailable (private mode) — fail silently
  }
}

export function getAll() {
  return readAll().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

export function getByVideoId(videoId) {
  return readAll().find((r) => r.videoId === videoId) || null;
}

export function isSaved(videoId) {
  return getByVideoId(videoId) != null;
}

// Upserts a saved recipe record. `patch` is shallow-merged onto any existing
// record for this videoId (or used as the whole record if new).
export function save(videoId, patch) {
  const all = readAll();
  const now = Date.now();
  const idx = all.findIndex((r) => r.videoId === videoId);
  if (idx === -1) {
    const record = { videoId, savedAt: now, updatedAt: now, memo: "", servings: null, ...patch };
    all.push(record);
    writeAll(all);
    return record;
  }
  const updated = { ...all[idx], ...patch, videoId, updatedAt: now };
  all[idx] = updated;
  writeAll(all);
  return updated;
}

export function remove(videoId) {
  writeAll(readAll().filter((r) => r.videoId !== videoId));
}

export function search(query) {
  const q = query.trim();
  if (!q) return getAll();
  return getAll().filter((r) => `${r.title || ""}${r.memo || ""}`.includes(q));
}

// Short-lived cache for a just-analyzed (not yet saved) recipe, so navigating
// straight from the analyzing modal to the detail screen doesn't re-fetch.
function cacheKey(videoId) {
  return `cooklab:last-analyzed:${videoId}`;
}

export function cacheAnalyzed(videoId, recipe) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(cacheKey(videoId), JSON.stringify(recipe));
  } catch {
    // ignore
  }
}

export function getCachedAnalyzed(videoId) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(cacheKey(videoId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
