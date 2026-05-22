const KEYS_STORAGE = "rsp:admin-keys-v1";

export type KeyDuration = "5h" | "10h" | "lifetime";

export type GeneratedKey = {
  id: string;
  code: string;
  duration: KeyDuration;
  createdAt: number;
  disabled: boolean;
  usedBy: string | null;
  usedAt: number | null;
  expiresAt: number | null; // when access granted by this key expires; null = lifetime / unused
};

const DURATION_MS: Record<KeyDuration, number | null> = {
  "5h": 5 * 60 * 60 * 1000,
  "10h": 10 * 60 * 60 * 1000,
  lifetime: null,
};

const isBrowser = () => typeof window !== "undefined";

export const readKeys = (): GeneratedKey[] => {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(KEYS_STORAGE);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as GeneratedKey[];
  } catch {
    return [];
  }
};

const writeKeys = (keys: GeneratedKey[]) => {
  localStorage.setItem(KEYS_STORAGE, JSON.stringify(keys));
};

const randomCode = (duration: KeyDuration) => {
  const prefix =
    duration === "lifetime" ? "LIFE" : duration === "10h" ? "RBX10" : "RBX5";
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let body = "";
  for (let i = 0; i < 12; i++) {
    body += chars[Math.floor(Math.random() * chars.length)];
    if (i === 3 || i === 7) body += "-";
  }
  return `${prefix}-${body}`;
};

export const generateKey = (duration: KeyDuration): GeneratedKey => {
  const key: GeneratedKey = {
    id: crypto.randomUUID(),
    code: randomCode(duration),
    duration,
    createdAt: Date.now(),
    disabled: false,
    usedBy: null,
    usedAt: null,
    expiresAt: null,
  };
  const all = readKeys();
  all.unshift(key);
  writeKeys(all);
  return key;
};

export const deleteKey = (id: string) => {
  writeKeys(readKeys().filter((k) => k.id !== id));
};

export const toggleKeyDisabled = (id: string) => {
  writeKeys(
    readKeys().map((k) => (k.id === id ? { ...k, disabled: !k.disabled } : k)),
  );
};

export type ConsumeResult =
  | { ok: true; key: GeneratedKey; expiresAt: number | null }
  | { ok: false; reason: "not_found" | "disabled" | "already_used_other" | "expired" };

/**
 * Verify and (if first use) bind a key to this browser. Returns the access
 * expiration. Lifetime keys return expiresAt = null.
 */
export const consumeKey = (rawCode: string, userTag: string): ConsumeResult => {
  const code = rawCode.trim().toUpperCase();
  const all = readKeys();
  const idx = all.findIndex((k) => k.code.toUpperCase() === code);
  if (idx === -1) return { ok: false, reason: "not_found" };
  const key = all[idx];
  if (key.disabled) return { ok: false, reason: "disabled" };

  // Already bound to a different user/browser
  if (key.usedBy && key.usedBy !== userTag) {
    return { ok: false, reason: "already_used_other" };
  }

  const now = Date.now();
  // Already used by THIS user — re-grant remaining time (or lifetime).
  if (key.usedBy === userTag) {
    if (key.duration !== "lifetime" && key.expiresAt && key.expiresAt <= now) {
      return { ok: false, reason: "expired" };
    }
    return { ok: true, key, expiresAt: key.expiresAt };
  }

  const ms = DURATION_MS[key.duration];
  const expiresAt = ms === null ? null : now + ms;
  const updated: GeneratedKey = {
    ...key,
    usedBy: userTag,
    usedAt: now,
    expiresAt,
  };
  all[idx] = updated;
  writeKeys(all);
  return { ok: true, key: updated, expiresAt };
};

/** Stable per-browser tag (not personally identifying). */
const USER_TAG_KEY = "rsp:user-tag-v1";
export const getUserTag = (): string => {
  if (!isBrowser()) return "anon";
  let tag = localStorage.getItem(USER_TAG_KEY);
  if (!tag) {
    tag = `u-${crypto.randomUUID().slice(0, 8)}`;
    localStorage.setItem(USER_TAG_KEY, tag);
  }
  return tag;
};

export const formatDuration = (d: KeyDuration) =>
  d === "lifetime" ? "Lifetime" : d === "10h" ? "10 Hours" : "5 Hours";
