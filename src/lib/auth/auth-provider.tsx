"use client";

import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { authService } from "@/lib/auth/auth-service";
import { authStorage } from "@/lib/auth/auth-storage";
import type { AuthState, AuthUser, LoginCredentials } from "@/lib/auth/auth-types";

type AuthContextValue = AuthState & { login: (credentials: LoginCredentials) => Promise<AuthUser>; logout: () => Promise<void> };
export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => { try { setUser(authStorage.read()); } finally { setIsLoading(false); } }, []);
  const login = useCallback(async (credentials: LoginCredentials) => { const nextUser = await authService.login(credentials); authStorage.write(nextUser); setUser(nextUser); return nextUser; }, []);
  const logout = useCallback(async () => { try { await authService.logout(); } finally { authStorage.clear(); setUser(null); } }, []);
  const value = useMemo(() => ({ user, isAuthenticated: Boolean(user), isLoading, login, logout }), [isLoading, login, logout, user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
