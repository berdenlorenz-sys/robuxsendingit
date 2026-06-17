import { createFileRoute } from "@tanstack/react-router";

const FRIENDS: { username: string; displayName: string }[] = [
  { username: "Roblox", displayName: "Roblox" },
  { username: "builderman", displayName: "builderman" },
  { username: "Jandel", displayName: "Jandel" },
  { username: "Tofuu", displayName: "Tofuu" },
  { username: "Preston", displayName: "Preston" },
  { username: "Linkmon99", displayName: "Linkmon99" },
  { username: "Tanqr", displayName: "Tanqr" },
  { username: "KreekCraft", displayName: "KreekCraft" },
  { username: "Flamingo", displayName: "Flamingo" },
  { username: "Denis", displayName: "Denis" },
  { username: "Sketch", displayName: "Sketch" },
  { username: "MyUsernamesThis", displayName: "Bacon" },
  { username: "Telamon", displayName: "Telamon" },
  { username: "Stickmasterluke", displayName: "Stickmasterluke" },
];

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

let cache: { at: number; body: string } | null = null;
const TTL = 30 * 60 * 1000;

export const Route = createFileRoute("/api/friends")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async () => {
        if (cache && Date.now() - cache.at < TTL) {
          return new Response(cache.body, {
            status: 200,
            headers: { "Content-Type": "application/json", "X-Cache": "HIT", ...CORS },
          });
        }
        const headers = {
          Accept: "application/json",
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (compatible; RobuxApp/1.0)",
        };
        try {
          const lookup = await fetch("https://users.roproxy.com/v1/usernames/users", {
            method: "POST",
            headers,
            body: JSON.stringify({
              usernames: FRIENDS.map((f) => f.username),
              excludeBannedUsers: false,
            }),
          });
          const lj = (await lookup.json()) as {
            data?: {
              id: number;
              name: string;
              displayName: string;
              hasVerifiedBadge?: boolean;
              requestedUsername: string;
            }[];
          };
          const found = lj.data ?? [];
          const ids = found.map((u) => u.id).join(",");
          const avatars = new Map<number, string | null>();
          if (ids) {
            try {
              const t = await fetch(
                `https://thumbnails.roproxy.com/v1/users/avatar-headshot?userIds=${ids}&size=150x150&format=Png&isCircular=true`,
                { headers },
              );
              if (t.ok) {
                const tj = (await t.json()) as {
                  data?: { targetId: number; imageUrl: string; state: string }[];
                };
                for (const x of tj.data ?? []) {
                  avatars.set(x.targetId, x.state === "Completed" ? x.imageUrl : null);
                }
              }
            } catch {
              /* avatars optional */
            }
          }
          const users = FRIENDS.map((f) => {
            const m = found.find(
              (u) => (u.requestedUsername || u.name).toLowerCase() === f.username.toLowerCase(),
            );
            return {
              userId: m?.id ?? 0,
              username: m?.name ?? f.username,
              displayName: m?.displayName ?? f.displayName,
              avatar: m ? (avatars.get(m.id) ?? null) : null,
              hasVerifiedBadge: m?.hasVerifiedBadge ?? false,
              isBanned: false,
            };
          });
          const body = JSON.stringify({ users, error: null });
          cache = { at: Date.now(), body };
          return new Response(body, {
            status: 200,
            headers: { "Content-Type": "application/json", ...CORS },
          });
        } catch (e) {
          console.error("friends fetch error", e);
          return new Response(
            JSON.stringify({
              users: FRIENDS.map((f) => ({
                userId: 0,
                username: f.username,
                displayName: f.displayName,
                avatar: null,
                hasVerifiedBadge: false,
                isBanned: false,
              })),
              error: "Failed to load avatars",
            }),
            { status: 200, headers: { "Content-Type": "application/json", ...CORS } },
          );
        }
      },
    },
  },
});