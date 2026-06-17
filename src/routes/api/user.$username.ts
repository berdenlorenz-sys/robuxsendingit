import { createFileRoute } from "@tanstack/react-router";

type CacheEntry = { at: number; body: string };
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

const rateMap = new Map<string, { count: number; reset: number }>();
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 10_000;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

function json(data: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS, ...extra },
  });
}

function checkRate(ip: string): boolean {
  const now = Date.now();
  const cur = rateMap.get(ip);
  if (!cur || now > cur.reset) {
    rateMap.set(ip, { count: 1, reset: now + RATE_WINDOW_MS });
    return true;
  }
  cur.count++;
  return cur.count <= RATE_LIMIT;
}

export const Route = createFileRoute("/api/user/$username")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request, params }) => {
        const username = (params.username ?? "").trim();
        if (username.length < 3 || username.length > 50) {
          return json({ error: "Username must be 3-50 chars", users: [] }, 400);
        }

        const ip =
          request.headers.get("cf-connecting-ip") ||
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          "unknown";
        if (!checkRate(ip)) {
          return json({ error: "Rate limit exceeded", users: [] }, 429, {
            "Retry-After": "10",
          });
        }

        const key = username.toLowerCase();
        const cached = cache.get(key);
        if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
          return new Response(cached.body, {
            status: 200,
            headers: { "Content-Type": "application/json", "X-Cache": "HIT", ...CORS },
          });
        }

        const headers = {
          Accept: "application/json",
          "User-Agent": "Mozilla/5.0 (compatible; RobuxApp/1.0)",
        };

        try {
          const searchRes = await fetch(
            `https://users.roproxy.com/v1/users/search?keyword=${encodeURIComponent(username)}&limit=10`,
            { headers },
          );
          if (!searchRes.ok) {
            return json(
              {
                error:
                  searchRes.status === 429
                    ? "Roblox rate limit, try again shortly"
                    : `Roblox search failed (${searchRes.status})`,
                users: [],
              },
              searchRes.status === 429 ? 429 : 502,
            );
          }
          const searchJson = (await searchRes.json()) as {
            data?: { id: number; name: string; displayName: string }[];
          };
          const raw = (searchJson.data ?? []).slice(0, 8);
          if (raw.length === 0) {
            const body = JSON.stringify({ users: [], error: null });
            cache.set(key, { at: Date.now(), body });
            return new Response(body, {
              status: 200,
              headers: { "Content-Type": "application/json", ...CORS },
            });
          }

          const ids = raw.map((u) => u.id).join(",");
          const avatars = new Map<number, string | null>();
          try {
            const thumbRes = await fetch(
              `https://thumbnails.roproxy.com/v1/users/avatar-headshot?userIds=${ids}&size=150x150&format=Png&isCircular=true`,
              { headers },
            );
            if (thumbRes.ok) {
              const tj = (await thumbRes.json()) as {
                data?: { targetId: number; imageUrl: string; state: string }[];
              };
              for (const t of tj.data ?? []) {
                avatars.set(t.targetId, t.state === "Completed" ? t.imageUrl : null);
              }
            }
          } catch {
            // avatars optional
          }

          const details = await Promise.all(
            raw.map(async (u) => {
              try {
                const r = await fetch(`https://users.roproxy.com/v1/users/${u.id}`, { headers });
                if (!r.ok) return null;
                return (await r.json()) as {
                  created?: string;
                  description?: string;
                  isBanned?: boolean;
                  hasVerifiedBadge?: boolean;
                };
              } catch {
                return null;
              }
            }),
          );

          const users = raw.map((u, i) => {
            const d = details[i];
            let accountAgeDays: number | null = null;
            if (d?.created) {
              const ms = Date.now() - new Date(d.created).getTime();
              accountAgeDays = Math.max(0, Math.floor(ms / 86400000));
            }
            return {
              userId: u.id,
              username: u.name,
              displayName: u.displayName,
              avatar: avatars.get(u.id) ?? null,
              created: d?.created ?? null,
              accountAgeDays,
              description: d?.description ?? null,
              isBanned: d?.isBanned ?? false,
              hasVerifiedBadge: d?.hasVerifiedBadge ?? false,
            };
          });
          const body = JSON.stringify({ users, error: null });
          cache.set(key, { at: Date.now(), body });
          return new Response(body, {
            status: 200,
            headers: { "Content-Type": "application/json", ...CORS },
          });
        } catch (e) {
          console.error("user search error", e);
          return json({ error: "Failed to reach Roblox", users: [] }, 502);
        }
      },
    },
  },
});