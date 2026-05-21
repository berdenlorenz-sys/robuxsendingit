import { type ReactNode, useEffect, useState } from "react";
import { Check, Copy, KeyRound, Loader2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCESS_STORAGE_KEY = "rsp:key-access-v1";
const ACCESS_DURATION_MS = 5 * 60 * 60 * 1000;
const DEMO_KEY = "RBX-ACCESS-2026";
const OWNER_KEY = "OWNER-ACCESS-FOREVER";
const VALID_KEYS = new Set([DEMO_KEY, "ROBLOX-VERIFY-5H", "MAGICPATH-5H"]);

type AccessRecord = {
  mode: "normal" | "owner";
  expiresAt: number | null;
  grantedAt: number;
};

const isAccessRecord = (value: unknown): value is AccessRecord => {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<AccessRecord>;
  return (
    (record.mode === "normal" || record.mode === "owner") &&
    typeof record.grantedAt === "number" &&
    (record.expiresAt === null || typeof record.expiresAt === "number")
  );
};

const readStoredAccess = (): AccessRecord | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ACCESS_STORAGE_KEY);
    if (!raw) return null;
    const record: unknown = JSON.parse(raw);
    if (!isAccessRecord(record)) return null;
    if (record.mode === "owner") return record;
    if (record.expiresAt && record.expiresAt > Date.now()) return record;
    localStorage.removeItem(ACCESS_STORAGE_KEY);
  } catch {
    localStorage.removeItem(ACCESS_STORAGE_KEY);
  }
  return null;
};

const saveAccess = (record: AccessRecord) => {
  localStorage.setItem(ACCESS_STORAGE_KEY, JSON.stringify(record));
};

const formatRemaining = (ms: number) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
};

export function KeyGate({ children }: { children: ReactNode }) {
  const [access, setAccess] = useState<AccessRecord | null>(readStoredAccess);
  const [keyValue, setKeyValue] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
      setAccess(readStoredAccess());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const grantAccess = (mode: AccessRecord["mode"]) => {
    const record: AccessRecord = {
      mode,
      grantedAt: Date.now(),
      expiresAt: mode === "owner" ? null : Date.now() + ACCESS_DURATION_MS,
    };
    saveAccess(record);
    setStatus("success");
    setMessage(mode === "owner" ? "Owner access granted" : "Access granted");
    window.setTimeout(() => setAccess(record), 700);
  };

  const handleVerify = () => {
    const normalized = keyValue.trim().toUpperCase();
    if (normalized.length < 4 || status === "loading") return;
    setStatus("loading");
    setMessage("Verifying key...");
    window.setTimeout(() => {
      if (normalized === OWNER_KEY) {
        grantAccess("owner");
        return;
      }
      if (VALID_KEYS.has(normalized)) {
        grantAccess("normal");
        return;
      }
      setStatus("error");
      setMessage("Invalid key. Please try again.");
    }, 900);
  };

  const copyDemoKey = async () => {
    setKeyValue(DEMO_KEY);
    try {
      await navigator.clipboard.writeText(DEMO_KEY);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  if (access) {
    const remaining = access.expiresAt ? access.expiresAt - now : null;
    return (
      <>
        {children}
        <div className="fixed left-4 bottom-4 z-[80] rounded-full border border-white/10 bg-[#15151d]/85 px-3 py-2 text-[12px] font-bold text-white/80 shadow-xl backdrop-blur-md">
          {access.mode === "owner" ? "Owner access" : `Access ${formatRemaining(remaining ?? 0)}`}
        </div>
      </>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0d0d12] text-white flex items-center justify-center p-4 font-sans">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(139,92,246,0.18),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent_55%)]" />
      <div className="relative w-full max-w-[420px] rounded-2xl border border-white/10 bg-white/[0.065] shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl overflow-hidden">
        <div className="border-b border-white/10 bg-white/[0.035] px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-300/20 flex items-center justify-center shadow-[0_0_24px_rgba(139,92,246,0.22)]">
              <Lock className="w-4.5 h-4.5 text-violet-200" />
            </div>
            <div>
              <div className="text-[15px] font-black leading-tight">Key Required</div>
              <div className="text-[12px] text-white/45 leading-tight">Roblox access check</div>
            </div>
          </div>
          <div className="rounded-full border border-violet-300/20 bg-violet-400/10 px-2.5 py-1 text-[11px] font-extrabold text-violet-100">
            5H
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <button
            type="button"
            onClick={copyDemoKey}
            className="w-full h-12 rounded-xl bg-violet-500 hover:bg-violet-400 text-white font-black text-[14px] transition-all shadow-[0_0_28px_rgba(139,92,246,0.34)] active:scale-[0.99] flex items-center justify-center gap-2"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Key Copied" : "Get Key"}
          </button>

          <div className="mt-4 space-y-2">
            <label className="text-[12px] font-extrabold text-white/65" htmlFor="access-key">
              Access key
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35" />
              <input
                id="access-key"
                value={keyValue}
                onChange={(e) => {
                  setKeyValue(e.target.value);
                  if (status !== "loading") {
                    setStatus("idle");
                    setMessage("");
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleVerify();
                }}
                placeholder="Paste key here"
                autoComplete="off"
                className="w-full h-12 rounded-xl border border-white/10 bg-[#101018]/80 pl-10 pr-3 text-[15px] font-semibold text-white outline-none placeholder:text-white/30 focus:border-violet-300/60 focus:ring-2 focus:ring-violet-400/20 transition-all"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleVerify}
            disabled={status === "loading" || keyValue.trim().length < 4}
            className="mt-4 w-full h-12 rounded-xl bg-white/10 hover:bg-white/15 disabled:bg-white/[0.045] disabled:text-white/30 border border-white/10 text-white font-black text-[14px] transition-all flex items-center justify-center gap-2"
          >
            {status === "loading" && <Loader2 className="w-4 h-4 animate-spin" />}
            {status === "success" && <Check className="w-4 h-4 animate-in zoom-in-50 duration-300" />}
            {status === "loading" ? "Verifying" : "Verify Key"}
          </button>

          {message && (
            <div
              className={cn(
                "mt-4 rounded-xl border px-3 py-2.5 text-center text-[13px] font-bold transition-all",
                status === "error" && "border-red-400/20 bg-red-500/10 text-red-200",
                status === "success" && "border-emerald-300/20 bg-emerald-500/10 text-emerald-200",
                status === "loading" && "border-violet-300/20 bg-violet-500/10 text-violet-100",
              )}
            >
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default KeyGate;