"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthLoading } from "@/components/auth/auth-loading";
import { useAuth } from "@/hooks/use-auth";
import { canAccess, permissionForPath } from "@/lib/permissions";

export function ProtectedRoute({ children }: { children: React.ReactNode }) { const { user, isAuthenticated, isLoading } = useAuth(); const router = useRouter(); const pathname = usePathname(); const permission = permissionForPath(pathname); useEffect(() => { if (!isLoading && !isAuthenticated) router.replace(`/login?next=${encodeURIComponent(pathname)}`); else if (!isLoading && user && permission && !canAccess(user.role, permission)) router.replace("/unauthorized"); }, [isAuthenticated, isLoading, pathname, permission, router, user]); if (isLoading || !isAuthenticated || (user && permission && !canAccess(user.role, permission))) return <AuthLoading />; return <>{children}</>; }
