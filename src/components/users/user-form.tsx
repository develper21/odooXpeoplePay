"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useEmployees } from "@/hooks/use-data";
import { roleLabels } from "@/lib/permissions";
import { employeeName } from "@/lib/hr-utils";
import type { Role } from "@/lib/auth/auth-types";
import type { User } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface UserFormProps {
  initialData?: User;
  onSubmit: (data: Omit<User, "id">) => Promise<void>;
  isSubmitting?: boolean;
}

const roles: Role[] = [
  "ADMIN",
  "HR_PAYROLL_MANAGER",
  "HR_PAYROLL_USER",
  "HR_MANAGER",
  "EMPLOYEE",
];

export function UserForm({
  initialData,
  onSubmit,
  isSubmitting = false,
}: UserFormProps) {
  const router = useRouter();
  const { data: employees = [] } = useEmployees();

  const [name, setName] = useState(initialData?.name ?? "");
  const [email, setEmail] = useState(initialData?.email ?? "");
  const [role, setRole] = useState<Role>(initialData?.role ?? "EMPLOYEE");
  const [employeeId, setEmployeeId] = useState<string>(
    initialData?.employeeId ?? "",
  );
  const [status, setStatus] = useState<"ACTIVE" | "INVITED" | "INACTIVE">(
    initialData?.status ?? "ACTIVE",
  );
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName) {
      setError("Please enter a user full name.");
      return;
    }

    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setError("Please enter a valid work email address.");
      return;
    }

    try {
      await onSubmit({
        name: trimmedName,
        email: trimmedEmail,
        role,
        status,
        employeeId: employeeId ? employeeId : undefined,
        lastActivity: initialData?.lastActivity ?? new Date().toISOString(),
        createdAt: initialData?.createdAt ?? new Date().toISOString(),
      });
    } catch (err: any) {
      setError(err?.message || "Failed to save user record.");
    }
  };

  return (
    <Card className="max-w-2xl">
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-xs font-medium text-red-400">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-text-secondary">
                Full Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                required
                className="mt-1.5 h-10 w-full rounded-md border bg-surface-raised px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-text-secondary">
                Email Address *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. rahul.sharma@northstar.io"
                required
                className="mt-1.5 h-10 w-full rounded-md border bg-surface-raised px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-text-muted">
                Corporate email for sign-in and automated system notifications.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary">
                Assigned Role *
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="mt-1.5 h-10 w-full rounded-md border bg-surface-raised px-3 text-sm text-text-primary focus:border-primary focus:outline-none"
              >
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {roleLabels[r]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary">
                Account Status *
              </label>
              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as "ACTIVE" | "INVITED" | "INACTIVE")
                }
                className="mt-1.5 h-10 w-full rounded-md border bg-surface-raised px-3 text-sm text-text-primary focus:border-primary focus:outline-none"
              >
                <option value="ACTIVE">Active</option>
                <option value="INVITED">Invited</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-text-secondary">
                Linked Employee Profile (Optional)
              </label>
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="mt-1.5 h-10 w-full rounded-md border bg-surface-raised px-3 text-sm text-text-primary focus:border-primary focus:outline-none"
              >
                <option value="">-- No Employee Linked --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.employeeNumber} · {employeeName(emp)} ({emp.department}{" "}
                    - {emp.position})
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-text-muted">
                Associates this login identity with an active HR employee
                profile for self-service operations.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" busy={isSubmitting}>
              {initialData ? "Save Changes" : "Create User"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
