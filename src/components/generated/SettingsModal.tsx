import { useEffect, useRef, useState } from "react";
import { X, Search, Loader2, Check, BadgeCheck } from "lucide-react";
import { fetchRobloxSearch, type RobloxSearchUser } from "@/lib/roblox-search-api";
import { RobloxAvatar } from "./RobloxAvatar";
import { formatFull } from "@/lib/format";

function formatJoined(created?: string | null, days?: number | null) {
  if (!created) return null;
  const d = new Date(created);
  const joined = d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  if (days == null) return `Joined ${joined}`;
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  const age =
    years > 0
      ? `${years}y ${months}m`
      : months > 0
        ? `${months}mo`
        : `${days}d`;
  return `Joined ${joined} · ${age} old`;
}

export type CurrentUser = {
  name: string;
  handle: string;
  avatarUrl: string | null;
};

export function SettingsModal({
  open,
  onClose,
  balance,
  user,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  balance: number;
  user: CurrentUser;
  onSave: (next: { balance: number; user: CurrentUser }) => void;
}) {
  const [balanceInput, setBalanceInput] = useState(String(balance));
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RobloxSearchUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState<CurrentUser>(user);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (open) {
      setBalanceInput(String(balance));
      setPicked(user);
      setQuery("");
      setResults([]);
      setErrMsg(null);
      setSearched(false);
    }
  }, [open, balance, user]);

  // Debounced live suggestions
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      setErrMsg(null);
      setSearched(false);
      setLoading(false);
      abortRef.current?.abort();
      return;
    }
    const t = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setLoading(true);
      setErrMsg(null);
      setSearched(true);
      const res = await fetchRobloxSearch(q, ctrl.signal);
      if (ctrl.signal.aborted) return;
      if (res.error) {
        setErrMsg(res.error);
        setResults([]);
      } else {
        setResults(res.users);
      }
      setLoading(false);
    }, 500);
    return () => clearTimeout(t);
  }, [query]);

  if (!open) return null;

  const parsedBalance = Math.max(0, Math.floor(Number(balanceInput.replace(/[^\d]/g, "")) || 0));

  const save = () => {
    onSave({ balance: parsedBalance, user: picked });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#0f1015] border border-white/10 rounded-2xl w-full max-w-[440px] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <span className="font-bold text-[15px]">Account settings</span>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white p-1 rounded-md hover:bg-white/5"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Current profile preview — Roblox-style top-nav chip */}
          <div>
            <label className="block text-[12px] font-bold text-white/70 mb-2 uppercase tracking-wider">
              Your profile
            </label>
            <div className="inline-flex items-center gap-2 bg-[#1b1b1e] border border-white/5 rounded-full pl-1 pr-4 py-1">
              <RobloxAvatar src={picked.avatarUrl} alt={picked.name} size={28} />
              <span className="text-[13px] font-extrabold text-white tracking-wide uppercase truncate max-w-[200px]">
                {picked.name}
              </span>
            </div>
            <p className="text-[11px] text-white/40 mt-1.5">{picked.handle}</p>
          </div>

          {/* Robux balance */}
          <div>
            <label className="block text-[12px] font-bold text-white/70 mb-2 uppercase tracking-wider">
              Robux balance
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={balanceInput}
              onChange={(e) => setBalanceInput(e.target.value.replace(/[^\d]/g, ""))}
              className="w-full h-11 bg-white/[0.04] border border-white/10 focus:border-blue-500 rounded-lg px-3 text-[15px] font-semibold text-white focus:outline-none"
              placeholder="0"
            />
            <p className="text-[11px] text-white/40 mt-1.5">
              Preview: {formatFull(parsedBalance)} Robux
            </p>
          </div>

          {/* Username search */}
          <div>
            <label className="block text-[12px] font-bold text-white/70 mb-2 uppercase tracking-wider">
              Roblox username
            </label>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setErrMsg(null);
                  }}
                  placeholder="Type a Roblox username"
                  className="w-full h-11 bg-white/[0.04] border border-white/10 focus:border-blue-500 rounded-lg pl-9 pr-9 text-sm text-white placeholder:text-white/40 focus:outline-none"
                />
                {loading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 animate-spin" />
                )}
            </div>

            {searched && errMsg && (
              <p className="text-[12px] text-red-400 mt-2">{errMsg}</p>
            )}
            {searched && !loading && !errMsg && results.length === 0 && (
              <p className="text-[12px] text-white/50 mt-2">No players found</p>
            )}

            {results.length > 0 && (
              <div className="mt-2 border border-white/10 rounded-lg overflow-hidden">
                {results.map((u) => {
                  const isPicked = picked.handle === `@${u.username}`;
                  const joinedLabel = formatJoined(u.created, u.accountAgeDays);
                  return (
                    <button
                      key={u.userId}
                      onClick={() =>
                        setPicked({
                          name: u.displayName || u.username,
                          handle: `@${u.username}`,
                          avatarUrl: u.avatar,
                        })
                      }
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 text-left border-b border-white/5 last:border-0"
                    >
                      <RobloxAvatar src={u.avatar} alt={u.username} size={40} />
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-[13px] font-semibold text-white truncate flex items-center gap-1">
                          {u.displayName || u.username}
                          {u.hasVerifiedBadge && (
                            <BadgeCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          )}
                          {u.isBanned && (
                            <span className="text-[9px] font-bold text-red-400 bg-red-500/10 border border-red-500/30 rounded px-1 py-0.5 uppercase">
                              Banned
                            </span>
                          )}
                        </span>
                        <span className="text-[11px] text-white/50 truncate">@{u.username}</span>
                        {joinedLabel && (
                          <span className="text-[10px] text-white/40 truncate mt-0.5">
                            {joinedLabel}
                          </span>
                        )}
                      </div>
                      {isPicked && <Check className="w-4 h-4 text-blue-400" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-white/5">
          <button
            onClick={onClose}
            className="h-10 px-4 rounded-lg text-[13px] font-semibold text-white/70 hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            onClick={save}
            className="h-10 px-5 rounded-lg bg-blue-500 hover:bg-blue-600 text-[13px] font-bold text-white"
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
