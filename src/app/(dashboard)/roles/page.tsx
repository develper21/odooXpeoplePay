"use client";

import Link from "next/link";
import { Shield, ShieldAlert, ShieldCheck, Users } from "lucide-react";
import { useRoles, useUsers } from "@/hooks/use-data";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingState, ErrorState } from "@/components/shared/states";
import {
  DataTable,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/shared/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RolesPage() {
  const { data: roles = [], isLoading, isError } = useRoles();
  const { data: users = [] } = useUsers();

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Roles could not be loaded." />;

  return (
    <>
      <PageHeader
        title="Role Management"
        description="Review canonical access roles, active user distributions, and permission profiles across the platform."
      />

      {/* Overview Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-muted">Defined Roles</p>
              <p className="mt-1 text-2xl font-bold text-text-primary">
                {roles.length}
              </p>
            </div>
            <div className="rounded-lg bg-blue-500/10 p-2 text-primary">
              <Shield className="size-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-muted">Assigned Users</p>
              <p className="mt-1 text-2xl font-bold text-green-400">
                {users.length}
              </p>
            </div>
            <div className="rounded-lg bg-green-500/10 p-2 text-green-400">
              <Users className="size-5" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-muted">Security Model</p>
              <p className="mt-1 text-sm font-bold text-primary">
                Role-Based Access Control
              </p>
              <p className="text-[10px] text-text-muted">
                Canonical Inheritance
              </p>
            </div>
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <ShieldCheck className="size-5" />
            </div>
          </div>
        </Card>
      </div>

      <DataTable>
        <TableHeader>
          <TableRow>
            <TableCell>Role</TableCell>
            <TableCell>Description</TableCell>
            <TableCell>Assigned Users</TableCell>
            <TableCell>Granted Permissions</TableCell>
            <TableCell>Classification</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHeader>
        <tbody>
          {roles.map((role) => (
            <TableRow key={role.id}>
              <TableCell>
                <div className="flex items-center gap-2.5">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Shield className="size-4" />
                  </div>
                  <div>
                    <Link
                      href={`/roles/${role.id}`}
                      className="font-semibold text-text-primary hover:text-primary"
                    >
                      {role.name}
                    </Link>
                    <span className="block text-[10px] text-text-muted font-mono">
                      {role.id}
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell className="max-w-md text-xs text-text-secondary leading-relaxed">
                {role.description}
              </TableCell>
              <TableCell>
                <span className="inline-flex items-center gap-1 rounded-md bg-surface-raised px-2.5 py-1 text-xs font-semibold text-text-primary">
                  <Users className="size-3 text-text-muted" />
                  {role.userCount} users
                </span>
              </TableCell>
              <TableCell>
                <span className="inline-flex items-center rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  {role.permissionCount} permissions
                </span>
              </TableCell>
              <TableCell>
                <span className="inline-flex rounded-full bg-slate-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-300 border border-slate-500/20">
                  System Role
                </span>
              </TableCell>
              <TableCell>
                <Link
                  href={`/roles/${role.id}`}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Manage Permissions →
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </tbody>
      </DataTable>
    </>
  );
}
