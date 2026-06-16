export type RobloxSearchUser = {
  userId: number;
  username: string;
  displayName: string;
  avatar: string | null;
  created?: string | null;
  accountAgeDays?: number | null;
  description?: string | null;
  isBanned?: boolean;
  hasVerifiedBadge?: boolean;
};

export type RobloxSearchResponse = {
  users: RobloxSearchUser[];
  error: string | null;
};

export async function fetchRobloxSearch(
  q: string,
  signal?: AbortSignal,
): Promise<RobloxSearchResponse> {
  const fullUrl = `https://roblox-solo-proxy-1.onrender.com/search-roblox?username=${encodeURIComponent(q)}`;
  console.log("Initiating proxy request to:", fullUrl);
  try {
    const res = await fetch(fullUrl, { signal });
    const data = (await res.json()) as {
      data?: Array<{
        id: number;
        name: string;
        displayName: string;
        hasVerifiedBadge?: boolean;
      }>;
    };
    console.log("Proxy response data:", data);
    if (!res.ok) {
      return { users: [], error: `Search failed (${res.status})` };
    }
    const raw = data.data ?? [];
    const users: RobloxSearchUser[] = raw.map((u) => ({
      userId: u.id,
      username: u.name,
      displayName: u.displayName,
      avatar: null,
      created: null,
      accountAgeDays: null,
      description: null,
      isBanned: false,
      hasVerifiedBadge: u.hasVerifiedBadge ?? false,
    }));
    return { users, error: null };
  } catch (e) {
    if ((e as Error).name === "AbortError") {
      return { users: [], error: null };
    }
    return { users: [], error: "Connection Error" };
  }
}
