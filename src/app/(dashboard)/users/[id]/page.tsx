"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Edit3,
  Mail,
  Shield,
  Trash2,
  User,
  UserCheck,
} from "lucide-react";
import { useUser, useEmployee, useDeleteUser } from "@/hooks/use-data";
import {
  roleLabels,
  roleDescriptions,
  rolePermissions,
  permissionModules,
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

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: userItem, isLoading, isError } = useUser(id);
  const { data: employee } = useEmployee(userItem?.employeeId ?? "");
  const deleteMutation = useDeleteUser();

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (isLoading) return <LoadingState />;
  if (isError || !userItem)
    return <ErrorState message="User record not found." />;

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(id);
    setToastMessage("User account removed.");
    setTimeout(() => {
      router.push("/users");
    }, 600);
  };

  const userRole: Role = (userItem.role || (userItem as any).roleCode || "EMPLOYEE") as Role;
  const roleName = roleLabels[userRole] || (userItem as any).roleName || userRole;
  const roleDesc = roleDescriptions[userRole] || "Enterprise system user profile and access privileges.";
  const displayName =
    userItem.name ||
    `${(userItem as any).firstName || ""} ${(userItem as any).lastName || ""}`.trim() ||
    userItem.email ||
    "User";
  const activePermissions = rolePermissions[userRole] || [];
  const initials =
    displayName
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase() || "U";

  const formatDateTime = (iso?: string) => {
    if (!iso) return "—";
    try {
      return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  return (
    <>
      {toastMessage && <Toast message={toastMessage} />}

      <PageHeader
        title={displayName}
        description={`User Account · ${userItem.email}`}
        action={{
          label: "Edit User",
          href: `/users/${id}/edit`,
        }}
      />

      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <StatusBadge status={userItem.status} />
          <span className="inline-flex items-center gap-1.5 rounded-md border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            <Shield className="size-3.5" />
            {roleName}
          </span>
        </div>

        <Button
          variant="danger"
          size="sm"
          onClick={() => setConfirmDeleteOpen(true)}
          className="gap-1.5"
        >
          <Trash2 className="size-3.5" /> Delete User
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* User Profile Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>User Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-base font-bold text-primary">
                {initials}
              </span>
              <div>
                <p className="font-semibold text-text-primary">{displayName}</p>
                <p className="text-xs text-text-muted">{userItem.email}</p>
                {(userItem as any).phone && (
                  <p className="text-xs text-text-muted">{(userItem as any).phone}</p>
                )}
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t">
              <div>
                <p className="text-xs text-text-muted">Account Role</p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-sm font-semibold text-text-primary">
                    {roleName}
                  </span>
                  <Link
                    href={`/roles/${userRole}`}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    View Role Matrix →
                  </Link>
                </div>
                <p className="mt-1 text-[11px] text-text-muted leading-relaxed">
                  {roleDesc}
                </p>
              </div>

              <div>
                <p className="text-xs text-text-muted">
                  Linked Employee Profile
                </p>
                {employee ? (
                  <Link
                    href={`/employees/${employee.id}`}
                    className="mt-1 block rounded-md border bg-surface-raised p-2.5 hover:border-primary"
                  >
                    <p className="text-xs font-semibold text-primary">
                      {employeeName(employee)}
                    </p>
                    <p className="text-[11px] text-text-muted">
                      {employee.employeeNumber} · {employee.department} ·{" "}
                      {employee.position}
                    </p>
                  </Link>
                ) : (
                  <p className="mt-1 text-xs text-text-muted italic">
                    No employee profile linked.
                  </p>
                )}
              </div>

              <div>
                <p className="text-xs text-text-muted">Last Activity</p>
                <p className="mt-1 text-xs font-medium text-text-secondary">
                  {formatDateTime(userItem.lastActivity)}
                </p>
              </div>

              <div>
                <p className="text-xs text-text-muted">Created Date</p>
                <p className="mt-1 text-xs font-medium text-text-secondary">
                  {formatDateTime(userItem.createdAt)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inherited Permissions Matrix Summary */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Role & Inherited Permissions</CardTitle>
              <p className="mt-1 text-xs text-text-muted">
                Effective access privileges inherited from{" "}
                <strong>{roleName}</strong> (
                {activePermissions.length} total granted)
              </p>
            </div>
            <Link
              href={`/roles/${userRole}`}
              className="text-xs font-medium text-primary hover:underline"
            >
              Configure Role →
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {permissionModules.map((group) => {
                const grantedInModule = group.permissions.filter((p) =>
                  activePermissions.includes(p.key),
                );
                const hasFullAccess =
                  grantedInModule.length === group.permissions.length &&
                  group.permissions.length > 0;

                return (
                  <div
                    key={group.module}
                    className="rounded-lg border border-border-subtle bg-surface-raised p-3.5"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-text-primary">
                        {group.module}
                      </span>
                      <span
                        className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded ${
                          grantedInModule.length > 0
                            ? "bg-green-500/10 text-green-400 border border-green-500/20"
                            : "bg-slate-500/10 text-slate-400"
                        }`}
                      >
                        {grantedInModule.length} / {group.permissions.length}{" "}
                        granted
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {group.permissions.map((p) => {
                        const isGranted = activePermissions.includes(p.key);
                        return (
                          <span
                            key={p.key}
                            className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium ${
                              isGranted
                                ? "bg-primary/10 text-primary border border-primary/20"
                                : "bg-surface text-text-muted/40 line-through"
                            }`}
                          >
                            {isGranted && <CheckCircle2 className="size-2.5" />}
                            {p.label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        open={confirmDeleteOpen}
        title="Delete User Account?"
        message="This user will permanently lose sign-in access. Employee records will remain intact."
        confirmLabel="Delete User"
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDelete}
        busy={deleteMutation.isPending}
      />
    </>
  );
}
