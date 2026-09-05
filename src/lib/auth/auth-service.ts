import { mockAuthUsers } from "@/data/mock/auth-users";
import { dataMode } from "@/lib/data-mode";
import { apiClient } from "@/lib/api/client";
import type { AuthUser, LoginCredentials } from "@/lib/auth/auth-types";

export const authService = {
  getDevelopmentAccounts() { return dataMode === "mock" ? mockAuthUsers : []; },
  async login(credentials: LoginCredentials): Promise<AuthUser> {
    if (dataMode === "api") return apiClient<AuthUser>("/auth/login", { method: "POST", body: JSON.stringify(credentials) });
    const user = mockAuthUsers.find((candidate) => candidate.email.toLowerCase() === credentials.email.toLowerCase());
    if (!user || credentials.password.length < 6) throw new Error("Invalid mock account or password.");
    return user;
  },
  async logout() { if (dataMode === "api") await apiClient<void>("/auth/logout", { method: "POST" }); },
};
