"use client";

import Link from "next/link";
import { ArrowLeft, ShieldX } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-xl border bg-surface p-8 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-danger/10 text-danger">
          <ShieldX className="size-6" />
        </span>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-danger">
          Access denied
        </p>
        <h1 className="mt-2 text-2xl font-bold">
          You do not have permission to access this area.
        </h1>
        <p className="mt-3 text-sm text-text-secondary">
          Your current role does not include the permission required for this
          page.
        </p>
        <Link
          href="/dashboard"
          className="mx-auto mt-7 inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-white hover:bg-blue-500"
        >
          <ArrowLeft className="size-4" />
          Return to Dashboard
        </Link>
      </div>
    </main>
  );
}
