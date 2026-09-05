import type { AuthUser } from "@/lib/auth/auth-types";
import { roles } from "@/lib/auth/auth-types";

const storageKey = "peoplepay360.mock-session";
export const authStorage = {
  read(): AuthUser | null { if (typeof window === "undefined") return null; try { const raw = window.localStorage.getItem(storageKey); if (!raw) return null; const candidate = JSON.parse(raw) as Partial<AuthUser>; if (typeof candidate.id !== "string" || typeof candidate.name !== "string" || typeof candidate.email !== "string" || typeof candidate.initials !== "string" || !candidate.role || !roles.includes(candidate.role)) { window.localStorage.removeItem(storageKey); return null; } return candidate as AuthUser; } catch { window.localStorage.removeItem(storageKey); return null; } },
  write(user: AuthUser) { window.localStorage.setItem(storageKey, JSON.stringify(user)); },
  clear() { window.localStorage.removeItem(storageKey); },
};
