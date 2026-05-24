import { useEffect, useRef, useState } from "react";
import { X, Search, Check, Loader2, ChevronDown, History, Trash2, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatFull, formatRobux } from "@/lib/format";
import { fetchRobloxSearch, type RobloxSearchUser } from "@/lib/roblox-search-api";
import { RobloxAvatar } from "./RobloxAvatar";

const RobuxIcon = ({ className, size = 16 }: { className?: string; size?: number }) => (
  <svg viewBox="0 0 32 32" width={size} height={size} className={cn("fill-current", className)}>
    <path d="M15.0762 7.29574C15.6479 6.96571 16.3521 6.96571 16.9238 7.29574L23.0762 10.8479C23.6479 11.1779 24 11.7878 24 12.4479V19.5521C24 20.2122 23.6479 20.8221 23.0762 21.1521L16.9238 24.7043C16.3521 25.0343 15.6479 25.0343 15.0762 24.7043L8.92376 21.1521C8.35214 20.8221 8 20.2122 8 19.5521V12.4479C8 11.7878 8.35214 11.1779 8.92376 10.8479L15.0762 7.29574ZM11.9998 13V19C11.9998 19.5523 12.4475 20 12.9998 20H18.9998C19.5521 20 19.9998 19.5523 19.9998 19V13C19.9998 12.4477 19.5521 12 18.9998 12H12.9998C12.4475 12 11.9998 12.4477 11.9998 13Z" />
    <path d="M13.8556 2.56068C15.1825 1.81311 16.8175 1.81311 18.1444 2.56068L26.8556 7.46819C28.1825 8.21577 29 9.59734 29 11.0925V20.9075C29 22.4027 28.1825 23.7842 26.8556 24.5318L18.1444 29.4393C16.8175 30.1869 15.1825 30.1869 13.8556 29.4393L5.14444 24.5318C3.81746 23.7842 3 22.4027 3 20.9075V11.0925C3 9.59734 3.81746 8.21577 5.14444 7.46819L13.8556 2.56068ZM17.1628 4.30319C16.4452 3.89894 15.5548 3.89894 14.8372 4.30319L6.12611 9.2107C5.41362 9.61209 5 10.336 5 11.0925V20.9075C5 21.664 5.41362 22.3879 6.12611 22.7893L14.8372 27.6968C16.5548 28.1011 16.4452 28.1011 17.1628 27.6968L25.8739 22.7893C26.5864 22.3879 27 21.664 27 20.9075V11.0925C27 10.336 26.5864 9.61209 25.8739 9.2107L17.1628 4.30319Z" />
  </svg>
);

const PRESETS = [25, 50, 100, 200];

type Activity = {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string | null;
  amount: number;
  at: number;
};
const HISTORY_KEY = "rsp:recent-activity";

const loadHistory = (): Activity[] => {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
};

const saveHistory = (h: Activity[]) => {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
  } catch {
    /* noop */
  }
};

const timeAgo = (ts: number): string => {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 45) return "Just now";
  if (s < 90) return "1 min ago";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

type Friend = {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string | null;
  created?: string | null;
  accountAgeDays?: number | null;
  hasVerifiedBadge?: boolean;
  isBanned?: boolean;
};

const toFriend = (u: RobloxSearchUser): Friend => ({
  id: String(u.userId),
  name: u.displayName || u.username,
  handle: `@${u.username}`,
  avatarUrl: u.avatar,
  created: u.created ?? null,
  accountAgeDays: u.accountAgeDays ?? null,
  hasVerifiedBadge: u.hasVerifiedBadge,
  isBanned: u.isBanned,
});

type Step = "pick" | "amount" | "sending" | "done";


export function SendRobuxModal({
  open,
  onClose,
  balance,
  onSent,
}: {
  open: boolean;
  onClose: () => void;
  balance: number;
  onSent: (amount: number) => void;
}) {
  const [step, setStep] = useState<Step>("pick");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [friend, setFriend] = useState<Friend | null>(null);
  const [amount, setAmount] = useState<number>(200);
  const [searched, setSearched] = useState(false);
  const [history, setHistory] = useState<Activity[]>(loadHistory);
  const [showHistory, setShowHistory] = useState(false);
  const [customAmount, setCustomAmount] = useState<string>("");
  const abortRef = useRef<AbortController | null>(null);

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
        setResults(res.users.map(toFriend));
      }
      setLoading(false);
    }, 800);
    return () => clearTimeout(t);
  }, [query]);

  if (!open) return null;

  const reset = () => {
    setStep("pick");
    setQuery("");
    setResults([]);
    setErrMsg(null);
    setFriend(null);
    setAmount(200);
    setSearched(false);
    setCustomAmount("");
  };
  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSend = () => {
    setStep("sending");
    setTimeout(() => {
      onSent(amount);
      if (friend) {
        const entry: Activity = {
          id: `${Date.now()}-${friend.id}`,
          name: friend.name,
          handle: friend.handle,
          avatarUrl: friend.avatarUrl,
          amount,
          at: Date.now(),
        };
        const next = [entry, ...history].slice(0, 25);
        setHistory(next);
        try {
          localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
        } catch {}
      }
      setStep("done");
    }, 1600);
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        className="bg-[#0f1015] border border-white/10 rounded-2xl w-full max-w-[420px] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <RobuxIcon size={18} className="text-white" />
            <span className="font-bold text-[15px]">Send Robux</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-white/90" title={formatFull(balance)}>
              <RobuxIcon size={16} className="text-white" />
              <span className="text-[13px] font-semibold">{formatRobux(balance)}</span>
            </div>
            <button
              onClick={handleClose}
              className="text-white/60 hover:text-white p-1 rounded-md hover:bg-white/5"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        {step === "pick" && (
          <div className="p-5">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setErrMsg(null);
                  }}
                  placeholder="Search by username (min 3 chars)"
                  className="w-full h-12 bg-transparent border-2 border-blue-500 rounded-xl pl-10 pr-10 text-[15px] text-white placeholder:text-white/40 focus:outline-none"
                />
                {loading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400 animate-spin" />
                )}
              </div>
            </div>

            <div className="text-[14px] font-extrabold text-white mb-2">
              {!searched ? "My friends" : `Results${results.length ? ` (${results.length})` : ""}`}
            </div>

            <div className="max-h-[320px] overflow-y-auto -mx-2 pr-1 min-h-[180px]">
              {!searched && (
                <div className="px-3 py-10 text-center text-white/50 text-sm">
                  Type at least 3 characters to search
                </div>
              )}
              {searched && errMsg && (
                <div className="px-3 py-3 text-center text-red-400 text-sm">{errMsg}</div>
              )}
              {searched && !loading && !errMsg && results.length === 0 && (
                <div className="px-3 py-10 text-center text-white/50 text-sm">No players found</div>
              )}
              {results.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      setFriend(f);
                      setStep("amount");
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-left"
                  >
                    <RobloxAvatar src={f.avatarUrl} alt={f.name} size={40} />
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-[14px] font-semibold text-white truncate flex items-center gap-1">
                        {f.name}
                        {f.hasVerifiedBadge && (
                          <BadgeCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        )}
                        {f.isBanned && (
                          <span className="text-[9px] font-bold text-red-400 bg-red-500/10 border border-red-500/30 rounded px-1 py-0.5 uppercase">
                            Banned
                          </span>
                        )}
                      </span>
                      <span className="text-[12px] text-white/50 truncate">{f.handle}</span>
                    </div>
                  </button>
              ))}
            </div>

            {/* Recent Activity */}
            <div className="mt-4 border-t border-white/5 pt-3">
              <div
                role="button"
                tabIndex={0}
                onClick={() => setShowHistory((s) => !s)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setShowHistory((s) => !s);
                  }
                }}
                className="w-full flex items-center justify-between px-1 py-1.5 text-left group cursor-pointer select-none"
              >
                <div className="flex items-center gap-2">
                  <History className="w-3.5 h-3.5 text-white/50" strokeWidth={2.2} />
                  <span className="text-[13px] font-extrabold text-white/80 group-hover:text-white">
                    Recent Activity
                  </span>
                  {history.length > 0 && (
                    <span className="text-[11px] text-white/40 font-semibold">
                      {history.length}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {history.length > 0 && showHistory && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("Clear all recent activity?")) {
                          setHistory([]);
                          saveHistory([]);
                        }
                      }}
                      className="text-[11px] font-bold text-red-300/80 hover:text-red-200 px-2 py-1 rounded-md hover:bg-red-500/10"
                    >
                      Clear all
                    </button>
                  )}
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 text-white/40 transition-transform",
                      showHistory && "rotate-180",
                    )}
                  />
                </div>
              </div>
              {showHistory && (
                <div className="mt-1 max-h-[180px] overflow-y-auto -mx-2 pr-1">
                  {history.length === 0 ? (
                    <div className="px-3 py-6 text-center text-white/40 text-[12px]">
                      No recent transactions
                    </div>
                  ) : (
                    history.map((h) => (
                      <div
                        key={h.id}
                        className="group flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <RobloxAvatar src={h.avatarUrl ?? null} alt={h.name} size={32} />
                          <div className="flex flex-col min-w-0">
                            <span className="text-[12.5px] text-white/90 font-semibold truncate">
                              {h.name}
                              <span className="text-white/40 font-normal"> {h.handle}</span>
                            </span>
                            <span className="text-[11.5px] text-white/60 truncate">
                              Sent{" "}
                              <span className="font-bold text-white">
                                {formatFull(h.amount)} Robux
                              </span>
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="text-[11px] text-white/40">{timeAgo(h.at)}</span>
                          <button
                            type="button"
                            onClick={() => {
                              const next = history.filter((x) => x.id !== h.id);
                              setHistory(next);
                              saveHistory(next);
                            }}
                            className="p-1 rounded-md text-white/40 hover:text-red-300 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label="Delete entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {step === "amount" && friend && (
          <div className="p-6 flex flex-col items-center">
            <div className="mb-3">
              <RobloxAvatar src={friend.avatarUrl} alt={friend.name} size={64} />
            </div>
            <div className="text-[15px] font-semibold text-white/90 flex items-center gap-1">
              {friend.name}
              {friend.hasVerifiedBadge && (
                <BadgeCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              )}
            </div>
            <div className="text-[12px] text-white/50">{friend.handle}</div>
            {friend.created && (
              <div className="text-[11px] text-white/40 mt-0.5">
                Joined {new Date(friend.created).getFullYear()}
              </div>
            )}
            <div className="flex items-center gap-2 mt-4 mb-5">
              <RobuxIcon size={28} className="text-white" />
              <span className="text-[36px] font-black tracking-tight">{formatFull(amount)}</span>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mb-6">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    setAmount(p);
                    setCustomAmount("");
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 h-9 rounded-lg border text-[13px] font-semibold transition-colors",
                    amount === p
                      ? "border-white/60 bg-white/10"
                      : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]",
                  )}
                >
                  <RobuxIcon size={14} className="text-white" />
                  {p}
                </button>
              ))}
            </div>
            <div className="w-full mb-4">
              <label className="block text-[11px] font-bold uppercase tracking-wide text-white/50 mb-1.5">
                Custom amount
              </label>
              <div className="relative">
                <RobuxIcon
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60"
                />
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={balance}
                  value={customAmount}
                  onChange={(e) => {
                    const v = e.target.value;
                    setCustomAmount(v);
                    const n = parseInt(v, 10);
                    if (!isNaN(n) && n > 0) setAmount(n);
                  }}
                  placeholder="Enter amount"
                  className="w-full h-11 bg-white/[0.04] border border-white/10 focus:border-blue-500 rounded-lg pl-10 pr-3 text-[15px] text-white placeholder:text-white/30 focus:outline-none transition-colors"
                />
              </div>
            </div>
            <button
              onClick={handleSend}
              disabled={amount <= 0 || amount > balance}
              className="w-full h-12 bg-blue-500 hover:bg-blue-600 disabled:bg-white/10 disabled:text-white/40 rounded-lg font-bold text-white text-[15px] transition-colors"
            >
              {amount > balance ? "Not enough Robux" : "Next"}
            </button>
            <button
              onClick={() => setStep("pick")}
              className="mt-3 text-[12px] text-white/50 hover:text-white/80"
            >
              Choose a different player
            </button>
          </div>
        )}

        {step === "sending" && (
          <div className="p-10 flex flex-col items-center gap-5">
            <div className="w-16 h-16 rounded-full border-4 border-white/10 border-t-blue-500 animate-spin" />
            <div className="text-center">
              <div className="font-bold text-[18px]">Sending Robux...</div>
              <div className="text-white/50 text-[13px] mt-1">Please wait</div>
            </div>
          </div>
        )}

        {step === "done" && friend && (
          <div className="p-8 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/15 border border-white/15 flex items-center justify-center">
              <Check className="w-9 h-9 text-white/85" strokeWidth={3} />
            </div>
            <div className="text-center">
              <div className="font-black text-[22px]">Robux Sent!</div>
              <p className="text-white/70 text-[14px] mt-2">
                You sent{" "}
                <span className="font-bold text-white">{formatFull(amount)} Robux</span> to{" "}
                <span className="font-bold text-white">{friend.handle}</span>
              </p>
              <p className="mt-4 text-[12px] text-white/55 leading-relaxed rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">
                <span className="font-bold text-white/75">Note:</span> Please allow 3–5 working
                days for Robux delivery and processing.
              </p>
            </div>
            <button
              onClick={handleClose}
              className="mt-3 px-8 h-11 bg-white/10 hover:bg-white/15 rounded-lg font-bold text-[14px] transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default SendRobuxModal;
