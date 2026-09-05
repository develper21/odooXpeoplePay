"use client";

import { roleLabels } from "@/lib/permissions";
import { useAuth } from "@/hooks/use-auth";
import type { Role } from "@/lib/auth/auth-types";

export function RoleGate({ roles, children, fallback = null }: { roles: Role[]; children: React.ReactNode; fallback?: React.ReactNode }) { const { user } = useAuth(); return user && roles.includes(user.role) ? <>{children}</> : <>{fallback}</>; }
export { roleLabels };
