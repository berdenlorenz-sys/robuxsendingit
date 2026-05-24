export type RobloxSearchUser = {
  userId: number;
  username: string;
  displayName: string;
  avatar: string | null;
};

export type RobloxSearchResponse = {
  users: RobloxSearchUser[];
  error: string | null;
};

export async function fetchRobloxSearch(
  q: string,
  signal?: AbortSignal,
): Promise<RobloxSearchResponse> {
  try {
    const res = await fetch(`/api/user/${encodeURIComponent(q)}`, {
      signal,
    });
    const data = (await res.json()) as RobloxSearchResponse;
    if (!res.ok && !data.error) {
      return { users: [], error: `Search failed (${res.status})` };
    }
    return data;
  } catch (e) {
    if ((e as Error).name === "AbortError") {
      return { users: [], error: null };
    }
    return { users: [], error: "Network error" };
  }
}