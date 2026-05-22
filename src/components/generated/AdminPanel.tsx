import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  Check,
  Copy,
  Crown,
  Eye,
  EyeOff,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Plus,
  Settings as SettingsIcon,
  ShieldAlert,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  deleteKey,
  formatDuration,
  generateKey,
  readKeys,
  toggleKeyDisabled,
  type GeneratedKey,
  type KeyDuration,
} from "@/lib/key-store";

const ADMIN_USER = "TANGINA";
const ADMIN_PASS = "PUTANGINAMOPAKYU";
const AUTH_STORAGE = "rsp:admin-auth-v1";

type Section = "dashboard" | "generate" | "active" | "premium" | "settings";

const formatLeft = (expiresAt: number | null) => {
  if (expiresAt === null) return "Lifetime";
  const ms = expiresAt - Date.now();
  if (ms <= 0) return "Expired";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${m}m left`;
};

const formatDate = (ts: number) => new Date(ts).toLocaleString();

function LoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");

  const submit = () => {
    if (user.trim() === ADMIN_USER && pass === ADMIN_PASS) {
      sessionStorage.setItem(AUTH_STORAGE, "1");
      setError("");
      onSuccess();
      return;
    }
    setError("Access denied. Invalid credentials.");
  };

  return (
    <div className="min-h-screen bg-[#0a0a10] text-white flex items-center justify-center p-4 font-sans">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(139,92,246,0.18),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(236,72,153,0.12),transparent_40%)] pointer-events-none" />
      <div className="relative w-full max-w-[400px] rounded-2xl border border-white/10 bg-white/[0.05] backdrop-blur-2xl p-6 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-violet-500/15 border border-violet-300/20 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-violet-200" />
          </div>
          <div>
            <div className="text-[16px] font-black leading-tight">Admin Sign In</div>
            <div className="text-[12px] text-white/45">Owner access only</div>
          </div>
        </div>
        <label className="text-[12px] font-extrabold text-white/65">Username</label>
        <input
          value={user}
          onChange={(e) => setUser(e.target.value)}
          autoComplete="username"
          className="mt-1 w-full h-11 rounded-xl border border-white/10 bg-[#101018]/80 px-3 text-[14px] font-semibold outline-none focus:border-violet-300/60 focus:ring-2 focus:ring-violet-400/20"
        />
        <label className="mt-3 block text-[12px] font-extrabold text-white/65">Password</label>
        <div className="relative">
          <input
            type={showPass ? "text" : "password"}
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            autoComplete="current-password"
            className="mt-1 w-full h-11 rounded-xl border border-white/10 bg-[#101018]/80 px-3 pr-10 text-[14px] font-semibold outline-none focus:border-violet-300/60 focus:ring-2 focus:ring-violet-400/20"
          />
          <button
            type="button"
            onClick={() => setShowPass((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 mt-0.5 p-1.5 text-white/50 hover:text-white"
          >
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <button
          type="button"
          onClick={submit}
          className="mt-5 w-full h-11 rounded-xl bg-violet-500 hover:bg-violet-400 text-white font-black text-[14px] shadow-[0_0_28px_rgba(139,92,246,0.34)] active:scale-[0.99] transition-all"
        >
          Sign In
        </button>
        {error && (
          <div className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 text-red-200 text-[13px] font-bold text-center py-2.5">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: typeof Crown;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center justify-between">
        <div className="text-[12px] font-extrabold text-white/55 uppercase tracking-wide">
          {label}
        </div>
        <div
          className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center border",
            tone,
          )}
        >
          <Icon className="w-4.5 h-4.5" />
        </div>
      </div>
      <div className="mt-2 text-[28px] font-black tracking-tight">{value}</div>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        } catch {
          /* noop */
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] px-2.5 py-1.5 text-[11.5px] font-bold text-white/80"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function KeyRow({
  k,
  onChange,
}: {
  k: GeneratedKey;
  onChange: () => void;
}) {
  return (
    <div className="grid grid-cols-12 gap-3 items-center px-4 py-3 border-t border-white/5 text-[13px]">
      <div className="col-span-12 md:col-span-4 flex items-center gap-2 min-w-0">
        <KeyRound className="w-3.5 h-3.5 text-violet-300 shrink-0" />
        <code className="font-mono text-white truncate">{k.code}</code>
        <CopyButton text={k.code} />
      </div>
      <div className="col-span-4 md:col-span-2">
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-extrabold border",
            k.duration === "lifetime"
              ? "border-amber-300/30 bg-amber-400/10 text-amber-200"
              : k.duration === "10h"
                ? "border-sky-300/30 bg-sky-400/10 text-sky-200"
                : "border-violet-300/30 bg-violet-400/10 text-violet-200",
          )}
        >
          {formatDuration(k.duration)}
        </span>
      </div>
      <div className="col-span-4 md:col-span-2 text-white/70 truncate">
        {k.usedBy ?? <span className="text-white/30">Unused</span>}
      </div>
      <div className="col-span-4 md:col-span-2 text-white/60">
        {k.usedBy ? formatLeft(k.expiresAt) : formatDate(k.createdAt)}
      </div>
      <div className="col-span-12 md:col-span-2 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            toggleKeyDisabled(k.id);
            onChange();
          }}
          className={cn(
            "px-2.5 py-1.5 rounded-lg text-[11.5px] font-bold border",
            k.disabled
              ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/20"
              : "border-white/10 bg-white/[0.04] text-white/75 hover:bg-white/[0.08]",
          )}
        >
          {k.disabled ? "Enable" : "Disable"}
        </button>
        <button
          type="button"
          onClick={() => {
            if (confirm(`Delete key ${k.code}?`)) {
              deleteKey(k.id);
              onChange();
            }
          }}
          className="p-1.5 rounded-lg border border-red-400/20 bg-red-500/10 text-red-200 hover:bg-red-500/20"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function Dashboard({ keys }: { keys: GeneratedKey[] }) {
  const active = keys.filter(
    (k) => !k.disabled && (k.expiresAt === null || k.expiresAt > Date.now()),
  ).length;
  const used = keys.filter((k) => k.usedBy).length;
  const lifetime = keys.filter((k) => k.duration === "lifetime").length;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label="Total Keys"
        value={keys.length}
        icon={KeyRound}
        tone="border-violet-300/30 bg-violet-400/10 text-violet-200"
      />
      <StatCard
        label="Active"
        value={active}
        icon={BadgeCheck}
        tone="border-emerald-300/30 bg-emerald-400/10 text-emerald-200"
      />
      <StatCard
        label="Redeemed"
        value={used}
        icon={Users}
        tone="border-sky-300/30 bg-sky-400/10 text-sky-200"
      />
      <StatCard
        label="Lifetime"
        value={lifetime}
        icon={Crown}
        tone="border-amber-300/30 bg-amber-400/10 text-amber-200"
      />
    </div>
  );
}

function GenerateSection({ onCreated }: { onCreated: () => void }) {
  const [count, setCount] = useState(1);
  const [last, setLast] = useState<GeneratedKey[]>([]);

  const generate = (duration: KeyDuration) => {
    const created: GeneratedKey[] = [];
    for (let i = 0; i < Math.max(1, Math.min(count, 25)); i++) {
      created.push(generateKey(duration));
    }
    setLast(created);
    onCreated();
  };

  const options: { duration: KeyDuration; label: string; desc: string; icon: typeof Crown; tone: string }[] = [
    {
      duration: "5h",
      label: "5 Hours Key",
      desc: "Standard access pass",
      icon: Sparkles,
      tone: "from-violet-500/20 to-violet-500/0 border-violet-300/30",
    },
    {
      duration: "10h",
      label: "10 Hours Key",
      desc: "Extended access pass",
      icon: BadgeCheck,
      tone: "from-sky-500/20 to-sky-500/0 border-sky-300/30",
    },
    {
      duration: "lifetime",
      label: "Lifetime Premium",
      desc: "Never expires",
      icon: Crown,
      tone: "from-amber-500/20 to-amber-500/0 border-amber-300/30",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 flex items-center gap-3">
        <label className="text-[12px] font-extrabold text-white/65">Quantity</label>
        <input
          type="number"
          min={1}
          max={25}
          value={count}
          onChange={(e) => setCount(Math.max(1, Math.min(25, Number(e.target.value) || 1)))}
          className="w-24 h-9 rounded-lg border border-white/10 bg-[#101018]/80 px-3 text-[13px] font-semibold outline-none focus:border-violet-300/60"
        />
        <span className="text-[11.5px] text-white/40">Max 25 per batch</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {options.map((o) => (
          <div
            key={o.duration}
            className={cn(
              "rounded-2xl border bg-gradient-to-b p-5 flex flex-col",
              o.tone,
            )}
          >
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center mb-3">
              <o.icon className="w-5 h-5" />
            </div>
            <div className="text-[15px] font-black">{o.label}</div>
            <div className="text-[12px] text-white/55 mb-4">{o.desc}</div>
            <button
              type="button"
              onClick={() => generate(o.duration)}
              className="mt-auto h-10 rounded-xl bg-white text-[#0a0a10] font-black text-[13px] hover:bg-white/90 active:scale-[0.99] transition-all inline-flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Generate
            </button>
          </div>
        ))}
      </div>
      {last.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 text-[12px] font-extrabold text-white/65 uppercase tracking-wide">
            Just created ({last.length})
          </div>
          <div className="divide-y divide-white/5">
            {last.map((k) => (
              <div key={k.id} className="flex items-center justify-between px-4 py-2.5 text-[13px]">
                <code className="font-mono text-white">{k.code}</code>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-white/50">{formatDuration(k.duration)}</span>
                  <CopyButton text={k.code} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function KeysTable({
  keys,
  empty,
  onChange,
}: {
  keys: GeneratedKey[];
  empty: string;
  onChange: () => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden">
      <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2.5 text-[11px] font-extrabold uppercase tracking-wide text-white/50 bg-white/[0.03]">
        <div className="col-span-4">Key</div>
        <div className="col-span-2">Type</div>
        <div className="col-span-2">User</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-2 text-right">Actions</div>
      </div>
      {keys.length === 0 ? (
        <div className="px-4 py-10 text-center text-white/40 text-[13px]">{empty}</div>
      ) : (
        keys.map((k) => <KeyRow key={k.id} k={k} onChange={onChange} />)
      )}
    </div>
  );
}

function Sidebar({
  section,
  setSection,
  onLogout,
}: {
  section: Section;
  setSection: (s: Section) => void;
  onLogout: () => void;
}) {
  const items: { id: Section; label: string; icon: typeof Crown }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "generate", label: "Generate Keys", icon: Plus },
    { id: "active", label: "Active Keys", icon: KeyRound },
    { id: "premium", label: "Premium Users", icon: Crown },
    { id: "settings", label: "Settings", icon: SettingsIcon },
  ];
  return (
    <aside className="md:w-60 md:shrink-0 md:border-r md:border-white/5 md:bg-white/[0.02] p-4 md:p-5 flex md:flex-col gap-1 overflow-x-auto">
      <div className="hidden md:flex items-center gap-2.5 mb-6">
        <div className="w-9 h-9 rounded-xl bg-violet-500/15 border border-violet-300/20 flex items-center justify-center">
          <ShieldAlert className="w-4.5 h-4.5 text-violet-200" />
        </div>
        <div>
          <div className="text-[14px] font-black leading-tight">Admin Panel</div>
          <div className="text-[11px] text-white/45">Owner controls</div>
        </div>
      </div>
      {items.map((it) => {
        const active = section === it.id;
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => setSection(it.id)}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-bold transition-all shrink-0",
              active
                ? "bg-violet-500/15 border border-violet-300/25 text-white"
                : "text-white/65 hover:bg-white/[0.05] hover:text-white border border-transparent",
            )}
          >
            <it.icon className="w-4 h-4" />
            {it.label}
          </button>
        );
      })}
      <button
        type="button"
        onClick={onLogout}
        className="md:mt-auto flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-bold text-red-200 hover:bg-red-500/10 border border-transparent hover:border-red-400/20 shrink-0"
      >
        <LogOut className="w-4 h-4" />
        Sign out
      </button>
    </aside>
  );
}

export default function AdminPanel() {
  const [authed, setAuthed] = useState(false);
  const [section, setSection] = useState<Section>("dashboard");
  const [keys, setKeys] = useState<GeneratedKey[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setAuthed(sessionStorage.getItem(AUTH_STORAGE) === "1");
  }, []);

  useEffect(() => {
    if (!authed) return;
    setKeys(readKeys());
    const t = window.setInterval(() => setTick((n) => n + 1), 30_000);
    return () => window.clearInterval(t);
  }, [authed, tick]);

  const refresh = () => setKeys(readKeys());

  const premiumUsers = useMemo(() => {
    const map = new Map<string, GeneratedKey[]>();
    for (const k of keys) {
      if (!k.usedBy) continue;
      const arr = map.get(k.usedBy) ?? [];
      arr.push(k);
      map.set(k.usedBy, arr);
    }
    return Array.from(map.entries());
  }, [keys]);

  if (!authed) return <LoginScreen onSuccess={() => setAuthed(true)} />;

  const activeKeys = keys.filter(
    (k) => !k.disabled && (k.expiresAt === null || k.expiresAt > Date.now()),
  );

  return (
    <div className="min-h-screen bg-[#0a0a10] text-white font-sans flex flex-col md:flex-row">
      <Sidebar
        section={section}
        setSection={setSection}
        onLogout={() => {
          sessionStorage.removeItem(AUTH_STORAGE);
          setAuthed(false);
        }}
      />
      <main className="flex-1 p-5 md:p-8 max-w-6xl mx-auto w-full">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-[22px] md:text-[26px] font-black tracking-tight capitalize">
              {section === "active"
                ? "Active Keys"
                : section === "generate"
                  ? "Generate Keys"
                  : section === "premium"
                    ? "Premium Users"
                    : section}
            </h1>
            <p className="text-[12.5px] text-white/45 mt-0.5">
              Signed in as <span className="text-white/80 font-bold">{ADMIN_USER}</span>
            </p>
          </div>
        </header>

        {section === "dashboard" && <Dashboard keys={keys} />}
        {section === "generate" && <GenerateSection onCreated={refresh} />}
        {section === "active" && (
          <KeysTable keys={activeKeys} empty="No active keys yet." onChange={refresh} />
        )}
        {section === "premium" && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] overflow-hidden">
            {premiumUsers.length === 0 ? (
              <div className="px-4 py-10 text-center text-white/40 text-[13px]">
                No redeemed keys yet.
              </div>
            ) : (
              premiumUsers.map(([user, ks]) => (
                <div key={user} className="px-4 py-3 border-t border-white/5 first:border-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-300/20 flex items-center justify-center">
                        <Crown className="w-4 h-4 text-amber-200" />
                      </div>
                      <div>
                        <div className="text-[14px] font-black">{user}</div>
                        <div className="text-[11.5px] text-white/50">
                          {ks.length} key{ks.length === 1 ? "" : "s"} redeemed
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {ks.map((k) => (
                      <span
                        key={k.id}
                        className="text-[11px] font-bold rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5"
                      >
                        {formatDuration(k.duration)} · {formatLeft(k.expiresAt)}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        {section === "settings" && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 space-y-4">
            <div>
              <div className="text-[14px] font-black mb-1">Storage</div>
              <div className="text-[12.5px] text-white/55">
                Keys are stored in this browser's local storage. Clearing your
                browser data will remove all generated keys.
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (confirm("Delete ALL generated keys? This cannot be undone.")) {
                  for (const k of readKeys()) deleteKey(k.id);
                  refresh();
                }
              }}
              className="px-4 py-2 rounded-xl border border-red-400/30 bg-red-500/10 hover:bg-red-500/20 text-red-100 text-[13px] font-bold inline-flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" /> Delete all keys
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
