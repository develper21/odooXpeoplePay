"use client";

import { cloneElement, isValidElement } from "react";
import { usePermission } from "@/hooks/use-permission";
import type { Permission } from "@/lib/permissions";

export function PermissionGate({ permission, children, fallback = null, behavior = "hide" }: { permission: Permission; children: React.ReactNode; fallback?: React.ReactNode; behavior?: "hide" | "disable" }) { const allowed = usePermission(permission); if (allowed) return <>{children}</>; if (behavior === "disable" && isValidElement(children)) return cloneElement(children, { "aria-disabled": true, disabled: true } as { "aria-disabled": boolean; disabled: boolean }); return <>{fallback}</>; }
