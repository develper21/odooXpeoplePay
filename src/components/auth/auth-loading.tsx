export function AuthLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex items-center gap-3 text-sm text-text-secondary">
        <span className="size-2 animate-pulse rounded-full bg-primary" />
        Restoring your PeoplePay360 session...
      </div>
    </main>
  );
}
