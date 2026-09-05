"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { Plus, Search, ShieldCheck, UserCheck, UserX } from "lucide-react";
import { useUsers, useEmployees, useDeleteUser } from "@/hooks/use-data";
import { roleLabels } from "@/lib/permissions";
import { employeeName } from "@/lib/hr-utils";
import type { Role } from "@/lib/auth/auth-types";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingState, EmptyState, ErrorState } from "@/components/shared/states";
import { DataTable, TableCell, TableHeader, TableRow } from "@/components/shared/table";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Toast } from "@/components/ui/toast";

export default function UsersPage() {
  const { data: users = [], isLoading, isError } = useUsers();
  const { data: employees = [] } = useEmployees();
  const deleteMutation = useDeleteUser();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase());
      const matchRole = roleFilter === "ALL" || u.role === roleFilter;
      const matchStatus = statusFilter === "ALL" || u.status === statusFilter;
      return matchSearch && matchRole && matchStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Users list could not be loaded." />;

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    await deleteMutation.mutateAsync(deleteTargetId);
    setToastMessage("User account removed successfully.");
    setDeleteTargetId(null);
  };

  const formatActivity = (iso?: string) => {
    if (!iso) return "Never";
    try {
      const d = new Date(iso);
      return new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
    } catch {
      return iso;
    }
  };

  return (
    <>
      {toastMessage && <Toast message={toastMessage} />}

      <PageHeader
        title="User Management"
        description="Oversee user accounts, assign enterprise roles, and audit access activity."
        action={{
          label: "Create User",
          href: "/users/new",
        }}
      />

      {/* Quick Role & Status summary widgets */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-muted">Total Accounts</p>
              <p className="mt-1 text-2xl font-bold text-text-primary">{users.length}</p>
            </div>
            <div className="rounded-lg bg-blue-500/10 p-2 text-primary">
              <UserCheck className="size-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-muted">Active Users</p>
              <p className="mt-1 text-2xl font-bold text-green-400">
                {users.filter((u) => u.status === "ACTIVE").length}
              </p>
            </div>
            <div className="rounded-lg bg-green-500/10 p-2 text-green-400">
              <ShieldCheck className="size-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-muted">Pending / Invited</p>
              <p className="mt-1 text-2xl font-bold text-amber-400">
                {users.filter((u) => u.status === "INVITED").length}
              </p>
            </div>
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400">
              <UserX className="size-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters toolbar */}
      <Card className="mb-5 p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-[260px] flex-1">
            <Search className="absolute left-3 top-3 size-4 text-text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="h-10 w-full rounded-md border bg-surface-raised pl-10 pr-3 text-sm placeholder:text-text-muted focus:border-primary focus:outline-none"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-10 rounded-md border bg-surface-raised px-3 text-xs text-text-secondary focus:border-primary focus:outline-none"
          >
            <option value="ALL">All Roles</option>
            <option value="ADMIN">Admin</option>
            <option value="HR_PAYROLL_MANAGER">HR Payroll Manager</option>
            <option value="HR_PAYROLL_USER">HR Payroll User</option>
            <option value="HR_MANAGER">HR Manager</option>
            <option value="EMPLOYEE">Employee</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-md border bg-surface-raised px-3 text-xs text-text-secondary focus:border-primary focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INVITED">Invited</option>
            <option value="INACTIVE">Inactive</option>
          </select>

          <button
            onClick={() => {
              setSearch("");
              setRoleFilter("ALL");
              setStatusFilter("ALL");
            }}
            className="h-10 rounded-md px-3 text-xs text-text-secondary hover:bg-surface-raised"
          >
            Reset
          </button>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          title="No users found"
          message="Try adjusting your search criteria or register a new user."
        />
      ) : (
        <DataTable>
          <TableHeader>
            <TableRow>
              <TableCell>User</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Employee Association</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Last Activity</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHeader>
          <tbody>
            {filtered.map((userItem) => {
              const emp = employees.find((e) => e.id === userItem.employeeId);
              const initials = userItem.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .substring(0, 2)
                .toUpperCase();

              return (
                <TableRow key={userItem.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-xs font-bold text-primary">
                        {initials}
                      </span>
                      <div>
                        <Link
                          href={`/users/${userItem.id}`}
                          className="font-semibold text-text-primary hover:text-primary"
                        >
                          {userItem.name}
                        </Link>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-text-secondary">{userItem.email}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {roleLabels[userItem.role]}
                    </span>
                  </TableCell>
                  <TableCell>
                    {emp ? (
                      <Link
                        href={`/employees/${emp.id}`}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        {employeeName(emp)} ({emp.employeeNumber})
                      </Link>
                    ) : (
                      <span className="text-xs text-text-muted">Unlinked</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status={userItem.status.toLowerCase() as "active" | "inactive" | "pending"}
                    />
                  </TableCell>
                  <TableCell className="text-xs text-text-muted">
                    {formatActivity(userItem.lastActivity)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/users/${userItem.id}`}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        View
                      </Link>
                      <span className="text-text-muted">·</span>
                      <Link
                        href={`/users/${userItem.id}/edit`}
                        className="text-xs font-medium text-text-secondary hover:text-text-primary hover:underline"
                      >
                        Edit
                      </Link>
                      <span className="text-text-muted">·</span>
                      <button
                        onClick={() => setDeleteTargetId(userItem.id)}
                        className="text-xs font-medium text-red-400 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </tbody>
        </DataTable>
      )}

      {/* Delete Confirmation */}
      <ConfirmationDialog
        open={Boolean(deleteTargetId)}
        title="Delete User Account?"
        message="This user will permanently lose sign-in access. Employee records associated with this user will not be deleted."
        confirmLabel="Delete User"
        onCancel={() => setDeleteTargetId(null)}
        onConfirm={handleDelete}
        busy={deleteMutation.isPending}
      />
    </>
  );
}
