"use client";

import { canAccess, hasAnyPermission, type Permission } from "@/lib/permissions";
import { useAuth } from "@/hooks/use-auth";

export function usePermission(permission: Permission) { const { user } = useAuth(); return Boolean(user && canAccess(user.role, permission)); }
export function useAnyPermission(permissions: Permission[]) { const { user } = useAuth(); return Boolean(user && hasAnyPermission(user.role, permissions)); }
