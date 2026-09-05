"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ExternalLink,
  Info,
  RotateCcw,
  Save,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import {
  useRole,
  useRolePermissions,
  useUpdateRolePermissions,
  useResetRolePermissions,
  useUsers,
  useEmployees,
} from "@/hooks/use-data";
import {
  roleLabels,
  roleDescriptions,
  defaultRolePermissions,
  permissionModules,
  type Permission,
} from "@/lib/permissions";
import type { Role } from "@/lib/auth/auth-types";
import { employeeName } from "@/lib/hr-utils";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingState, ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Toast } from "@/components/ui/toast";

const validRoles: Role[] = [
  "ADMIN",
  "HR_PAYROLL_MANAGER",
  "HR_PAYROLL_USER",
  "HR_MANAGER",
  "EMPLOYEE",
];

export default function RoleDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const roleKey = params.id as Role;

  const isValidRole = validRoles.includes(roleKey);
  const { data: roleInfo, isLoading: roleLoading, isError: roleError } = useRole(roleKey);
  const { data: activePermissions = [], isLoading: permLoading } = useRolePermissions(roleKey);
  const { data: users = [] } = useUsers();
  const { data: employees = [] } = useEmployees();

  const updateMutation = useUpdateRolePermissions();
  const resetMutation = useResetRolePermissions();

  // Local draft state for permissions matrix
  const [draftPermissions, setDraftPermissions] = useState<Permission[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  // Sync draft state when server/mock permissions load
  useEffect(() => {
    if (activePermissions) {
      setDraftPermissions([...activePermissions]);
    }
  }, [activePermissions]);

  const defaultPerms = useMemo(() => {
    return defaultRolePermissions[roleKey] || [];
  }, [roleKey]);

  // Check if draft has unsaved changes compared to active saved state
  const isDirty = useMemo(() => {
    if (draftPermissions.length !== activePermissions.length) return true;
    const activeSet = new Set(activePermissions);
    return draftPermissions.some((p) => !activeSet.has(p));
  }, [draftPermissions, activePermissions]);

  // Check if active saved permissions differ from system default
  const isCustomized = useMemo(() => {
    if (activePermissions.length !== defaultPerms.length) return true;
    const defaultSet = new Set(defaultPerms);
    return activePermissions.some((p) => !defaultSet.has(p));
  }, [activePermissions, defaultPerms]);

  // Users assigned to this specific role
  const assignedUsers = useMemo(() => {
    return users.filter((u) => u.role === roleKey);
  }, [users, roleKey]);

  if (!isValidRole) {
    return <ErrorState message={`Unknown enterprise role "${params.id}".`} />;
  }

  if (roleLoading || permLoading) return <LoadingState />;
  if (roleError || !roleInfo) return <ErrorState message="Role information could not be loaded." />;

  const togglePermission = (permKey: Permission) => {
    setDraftPermissions((prev) => {
      if (prev.includes(permKey)) {
        return prev.filter((p) => p !== permKey);
      } else {
        return [...prev, permKey];
      }
    });
  };

  const handleSelectAllModule = (modulePerms: Permission[]) => {
    setDraftPermissions((prev) => {
      const set = new Set(prev);
      modulePerms.forEach((p) => set.add(p));
      return Array.from(set);
    });
  };

  const handleDeselectAllModule = (modulePerms: Permission[]) => {
    setDraftPermissions((prev) => {
      const removeSet = new Set(modulePerms);
      return prev.filter((p) => !removeSet.has(p));
    });
  };

  const handleSaveChanges = async () => {
    await updateMutation.mutateAsync({
      role: roleKey,
      permissions: draftPermissions,
    });
    setToastMessage(`Permissions for ${roleLabels[roleKey]} updated successfully.`);
  };

  const handleDiscardChanges = () => {
    setDraftPermissions([...activePermissions]);
  };

  const handleResetToDefault = async () => {
    await resetMutation.mutateAsync(roleKey);
    setDraftPermissions([...defaultPerms]);
    setConfirmResetOpen(false);
    setToastMessage(`Reset ${roleLabels[roleKey]} permissions to system baseline.`);
  };

  return (
    <>
      {toastMessage && <Toast message={toastMessage} />}

      <div className="mb-2">
        <Link
          href="/roles"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted transition-colors hover:text-primary"
        >
          <ArrowLeft className="size-3.5" /> Back to All Roles
        </Link>
      </div>

      <PageHeader
        title={roleLabels[roleKey]}
        description={`Canonical Role Identifier · ${roleKey}`}
      />

      {/* Role Overview & Status Banner */}
      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Shield className="size-6" />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-lg font-bold text-text-primary">{roleLabels[roleKey]}</h2>
                <span className="font-mono text-xs text-text-muted">({roleKey})</span>
                {isCustomized ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase text-amber-400">
                    <AlertTriangle className="size-3" /> Custom Overrides Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase text-green-400">
                    <ShieldCheck className="size-3" /> System Baseline
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs text-text-secondary leading-relaxed">
                {roleDescriptions[roleKey]}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-border-subtle pt-3 text-xs">
                <div>
                  <span className="text-text-muted">Active Permissions: </span>
                  <span className="font-bold text-primary">{activePermissions.length}</span>
                  <span className="text-text-muted"> / {defaultPerms.length} default</span>
                </div>
                <div>
                  <span className="text-text-muted">Assigned Accounts: </span>
                  <span className="font-bold text-text-primary">{assignedUsers.length}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Assigned Users Summary Widget */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
              Assigned Accounts ({assignedUsers.length})
            </h3>
            <Link href="/users" className="text-[11px] font-semibold text-primary hover:underline">
              View All Users →
            </Link>
          </div>
          {assignedUsers.length === 0 ? (
            <p className="py-4 text-xs italic text-text-muted">No users currently hold this role.</p>
          ) : (
            <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
              {assignedUsers.map((u) => {
                const emp = employees.find((e) => e.id === u.employeeId);
                return (
                  <div
                    key={u.id}
                    className="flex items-center justify-between rounded-md border border-border-subtle bg-surface-raised p-2 text-xs"
                  >
                    <div>
                      <Link
                        href={`/users/${u.id}`}
                        className="font-semibold text-text-primary hover:text-primary"
                      >
                        {u.name}
                      </Link>
                      <p className="text-[10px] text-text-muted">{u.email}</p>
                    </div>
                    <StatusBadge status={u.status.toLowerCase() as "active" | "inactive" | "pending"} />
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Floating Unsaved Changes / Reset Bar */}
      {(isDirty || isCustomized) && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/10 p-4">
          <div className="flex items-center gap-3">
            <Info className="size-5 shrink-0 text-primary" />
            <div className="text-xs">
              {isDirty && (
                <p className="font-semibold text-text-primary">
                  You have unsaved permission modifications ({draftPermissions.length} selected).
                </p>
              )}
              {!isDirty && isCustomized && (
                <p className="text-text-secondary">
                  This role has customized privileges that differ from the system baseline.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isDirty && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleDiscardChanges}
                  disabled={updateMutation.isPending}
                >
                  Discard
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveChanges}
                  busy={updateMutation.isPending}
                  className="gap-1.5"
                >
                  <Save className="size-3.5" /> Save Changes
                </Button>
              </>
            )}
            {isCustomized && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setConfirmResetOpen(true)}
                disabled={resetMutation.isPending}
                className="gap-1.5 border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
              >
                <RotateCcw className="size-3.5" /> Reset to Baseline
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Permissions Matrix Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle>Permission Matrix</CardTitle>
            <p className="mt-1 text-xs text-text-muted">
              Configure read, create, update, delete, and workflow permissions for this role.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveChanges}
              disabled={!isDirty}
              busy={updateMutation.isPending}
              className="gap-1.5 text-xs"
            >
              <Save className="size-3.5" /> Save Changes
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-t bg-surface-raised text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                <tr>
                  <th className="px-5 py-3.5 min-w-[200px]">Module / Resource</th>
                  <th className="px-4 py-3.5 text-center w-24">Read</th>
                  <th className="px-4 py-3.5 text-center w-24">Create</th>
                  <th className="px-4 py-3.5 text-center w-24">Update</th>
                  <th className="px-4 py-3.5 text-center w-24">Delete</th>
                  <th className="px-5 py-3.5 min-w-[280px]">Operational & Workflow Actions</th>
                  <th className="px-4 py-3.5 text-right min-w-[120px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {permissionModules.map((group) => {
                  const moduleAllPermKeys = group.permissions.map((p) => p.key);
                  const readPerm = group.permissions.find((p) => p.action === "read");
                  const createPerm = group.permissions.find((p) => p.action === "create");
                  const updatePerm = group.permissions.find((p) => p.action === "update");
                  const deletePerm = group.permissions.find((p) => p.action === "delete");
                  const specialPerms = group.permissions.filter(
                    (p) => !["read", "create", "update", "delete"].includes(p.action)
                  );

                  const allSelectedInModule = moduleAllPermKeys.every((k) =>
                    draftPermissions.includes(k)
                  );

                  return (
                    <tr key={group.module} className="hover:bg-surface-raised/40 transition-colors">
                      {/* Module Title */}
                      <td className="px-5 py-4">
                        <span className="font-semibold text-text-primary block">{group.module}</span>
                        <span className="text-[10px] text-text-muted">
                          {moduleAllPermKeys.filter((k) => draftPermissions.includes(k)).length} of{" "}
                          {moduleAllPermKeys.length} enabled
                        </span>
                      </td>

                      {/* READ column */}
                      <td className="px-4 py-4 text-center">
                        {readPerm ? (
                          <PermissionToggle
                            permission={readPerm.key}
                            isActive={draftPermissions.includes(readPerm.key)}
                            isDefault={defaultPerms.includes(readPerm.key)}
                            isSavedActive={activePermissions.includes(readPerm.key)}
                            onToggle={() => togglePermission(readPerm.key)}
                          />
                        ) : (
                          <span className="text-text-muted/30 text-xs">—</span>
                        )}
                      </td>

                      {/* CREATE column */}
                      <td className="px-4 py-4 text-center">
                        {createPerm ? (
                          <PermissionToggle
                            permission={createPerm.key}
                            isActive={draftPermissions.includes(createPerm.key)}
                            isDefault={defaultPerms.includes(createPerm.key)}
                            isSavedActive={activePermissions.includes(createPerm.key)}
                            onToggle={() => togglePermission(createPerm.key)}
                          />
                        ) : (
                          <span className="text-text-muted/30 text-xs">—</span>
                        )}
                      </td>

                      {/* UPDATE column */}
                      <td className="px-4 py-4 text-center">
                        {updatePerm ? (
                          <PermissionToggle
                            permission={updatePerm.key}
                            isActive={draftPermissions.includes(updatePerm.key)}
                            isDefault={defaultPerms.includes(updatePerm.key)}
                            isSavedActive={activePermissions.includes(updatePerm.key)}
                            onToggle={() => togglePermission(updatePerm.key)}
                          />
                        ) : (
                          <span className="text-text-muted/30 text-xs">—</span>
                        )}
                      </td>

                      {/* DELETE column */}
                      <td className="px-4 py-4 text-center">
                        {deletePerm ? (
                          <PermissionToggle
                            permission={deletePerm.key}
                            isActive={draftPermissions.includes(deletePerm.key)}
                            isDefault={defaultPerms.includes(deletePerm.key)}
                            isSavedActive={activePermissions.includes(deletePerm.key)}
                            onToggle={() => togglePermission(deletePerm.key)}
                          />
                        ) : (
                          <span className="text-text-muted/30 text-xs">—</span>
                        )}
                      </td>

                      {/* Specialized Workflow Actions */}
                      <td className="px-5 py-4">
                        {specialPerms.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {specialPerms.map((sp) => {
                              const isGranted = draftPermissions.includes(sp.key);
                              const isDef = defaultPerms.includes(sp.key);
                              const isSaved = activePermissions.includes(sp.key);
                              const isMod = isGranted !== isSaved;

                              return (
                                <button
                                  key={sp.key}
                                  type="button"
                                  onClick={() => togglePermission(sp.key)}
                                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors border ${
                                    isGranted
                                      ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
                                      : "border-border-subtle bg-surface text-text-muted hover:text-text-primary"
                                  }`}
                                  title={`Toggle ${sp.label} (${sp.key})${isDef ? " [Default]" : ""}`}
                                >
                                  {isGranted ? (
                                    <Check className="size-3 text-primary" />
                                  ) : (
                                    <X className="size-3 text-text-muted/50" />
                                  )}
                                  <span>{sp.label}</span>
                                  {isMod && (
                                    <span className="size-1.5 rounded-full bg-amber-400" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-text-muted/40 text-xs italic">Standard CRUD only</span>
                        )}
                      </td>

                      {/* Bulk Quick Toggle */}
                      <td className="px-4 py-4 text-right">
                        {allSelectedInModule ? (
                          <button
                            type="button"
                            onClick={() => handleDeselectAllModule(moduleAllPermKeys)}
                            className="text-[11px] font-medium text-text-muted hover:text-red-400 hover:underline"
                          >
                            Clear All
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSelectAllModule(moduleAllPermKeys)}
                            className="text-[11px] font-medium text-primary hover:underline"
                          >
                            Select All
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Reset Confirmation Dialog */}
      <ConfirmationDialog
        open={confirmResetOpen}
        title={`Reset ${roleLabels[roleKey]} to Baseline?`}
        message="This will discard all customized permissions for this role and restore the canonical enterprise security baseline. Any active user permissions will update immediately."
        confirmLabel="Reset to Baseline"
        onCancel={() => setConfirmResetOpen(false)}
        onConfirm={handleResetToDefault}
        busy={resetMutation.isPending}
      />
    </>
  );
}

/**
 * Reusable cell toggle for standard CRUD permissions in the matrix
 */
function PermissionToggle({
  permission,
  isActive,
  isDefault,
  isSavedActive,
  onToggle,
}: {
  permission: Permission;
  isActive: boolean;
  isDefault: boolean;
  isSavedActive: boolean;
  onToggle: () => void;
}) {
  const isModified = isActive !== isSavedActive;

  return (
    <div className="inline-flex flex-col items-center justify-center">
      <button
        type="button"
        onClick={onToggle}
        className={`flex size-7 items-center justify-center rounded-md border transition-all ${
          isActive
            ? "border-primary/50 bg-primary/20 text-primary shadow-sm hover:bg-primary/30"
            : "border-border-subtle bg-surface text-text-muted/30 hover:border-border hover:text-text-muted"
        }`}
        title={`${isActive ? "Revoke" : "Grant"} ${permission}${isDefault ? " (Default)" : ""}`}
      >
        {isActive ? <Check className="size-4 stroke-[2.5]" /> : <X className="size-3.5" />}
      </button>
      {isModified && (
        <span className="mt-0.5 text-[9px] font-bold text-amber-400">
          {isActive ? "+add" : "-rem"}
        </span>
      )}
    </div>
  );
}
