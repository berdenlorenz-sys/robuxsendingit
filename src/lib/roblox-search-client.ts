import { searchRobloxUsers, type RobloxUser } from "./roblox.functions";

type SearchResult = { users: RobloxUser[]; error: string | null; retryAfterMs: number | null };

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { at: number; result: SearchResult }>();
let cooldownUntil = 0;

export const MIN_QUERY_LENGTH = 3;
export const MAX_SUGGESTIONS = 2;

export function getCooldownRemainingMs() {
  return Math.max(0, cooldownUntil - Date.now());
}

type SearchFn = ReturnType<typeof useSearchFnPlaceholder>;
function useSearchFnPlaceholder() {
  return searchRobloxUsers;
}

export async function searchRobloxUsersClient(
  searchFn: (args: { data: { keyword: string; limit: number } }) => Promise<SearchResult>,
  keyword: string,
): Promise<SearchResult> {
  const key = keyword.trim().toLowerCase();
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.result;
  }

  const remaining = getCooldownRemainingMs();
  if (remaining > 0) {
    return { users: [], error: "Roblox is busy, retrying soon", retryAfterMs: remaining };
  }

  const res = await searchFn({ data: { keyword, limit: 10 } });
  const sliced: SearchResult = {
    users: res.users.slice(0, MAX_SUGGESTIONS),
    error: res.error,
    retryAfterMs: res.retryAfterMs,
  };

  if (res.retryAfterMs) {
    cooldownUntil = Date.now() + res.retryAfterMs;
  } else if (!res.error) {
    cache.set(key, { at: Date.now(), result: sliced });
  }
  return sliced;
}

export type { SearchResult, SearchFn };