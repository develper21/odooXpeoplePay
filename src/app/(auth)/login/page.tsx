"use client";

import Link from "next/link";
import { Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { authService } from "@/lib/auth/auth-service";
import { roleLabels } from "@/lib/permissions";
import { AuthLoading } from "@/components/auth/auth-loading";

const loginSchema = z.object({ email: z.string().email("Enter a valid work email"), password: z.string().min(6, "Password must be at least 6 characters"), remember: z.boolean().optional() });
type LoginForm = z.infer<typeof loginSchema>;
const mockPassword = "peoplepay";
const developmentAccounts = authService.getDevelopmentAccounts();

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  const { login, isAuthenticated, isLoading } = useAuth();
  const { register, handleSubmit, setValue, setError, formState: { errors, isSubmitting } } = useForm<LoginForm>({ defaultValues: { email: "", password: mockPassword, remember: true } });
  useEffect(() => { if (!isLoading && isAuthenticated) router.replace("/dashboard"); }, [isAuthenticated, isLoading, router]);
  if (isLoading || isAuthenticated) return <AuthLoading />;
  const selectMockAccount = (email: string) => { setValue("email", email, { shouldValidate: true }); setValue("password", mockPassword); setMessage(""); };
  const submit = async (data: LoginForm) => { setMessage(""); const result = loginSchema.safeParse(data); if (!result.success) { setError("email", { message: result.error.issues[0]?.message }); return; } try { await login(result.data); router.replace("/dashboard"); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to sign in. Please try again."); } };
  return <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10"><div className="grid w-full max-w-5xl overflow-hidden rounded-xl border bg-surface shadow-2xl lg:grid-cols-[1.05fr_0.95fr]"><div className="hidden flex-col justify-between bg-surface-raised p-10 lg:flex"><div><div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-md bg-primary text-sm font-black">P</span><span className="text-sm font-bold tracking-[0.18em]">PEOPLEPAY<span className="text-primary">360</span></span></div><div className="mt-24 max-w-sm"><p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-primary">People operations, connected</p><h1 className="text-4xl font-bold leading-tight">A clearer view of your people and payroll.</h1><p className="mt-5 text-sm leading-6 text-text-secondary">Bring HR operations, compensation, and workforce insights into one calm, connected workspace.</p></div></div><div className="flex items-center gap-2 text-xs text-text-muted"><ShieldCheck className="size-4 text-success" />Frontend RBAC development workspace</div></div><div className="p-6 sm:p-10"><div className="mb-10 lg:hidden"><span className="flex size-9 items-center justify-center rounded-md bg-primary text-sm font-black">P</span><p className="mt-3 text-sm font-bold tracking-[0.18em]">PEOPLEPAY<span className="text-primary">360</span></p></div><div className="mb-8"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Welcome back</p><h2 className="mt-2 text-2xl font-bold">Sign in to your workspace</h2><p className="mt-2 text-sm text-text-secondary">Use a development account to test role-based access.</p></div><form onSubmit={handleSubmit(submit)} className="space-y-5"><label className="block text-sm font-medium">Work email<div className="relative mt-2"><Mail className="absolute left-3 top-3 size-4 text-text-muted" /><Input className="pl-10" type="email" placeholder="you@company.com" {...register("email")} /></div>{errors.email && <span className="mt-1 block text-xs text-danger">{errors.email.message}</span>}</label><label className="block text-sm font-medium">Password<div className="relative mt-2"><LockKeyhole className="absolute left-3 top-3 size-4 text-text-muted" /><Input className="pl-10 pr-10" type={showPassword ? "text" : "password"} placeholder="Enter your password" {...register("password")} /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-text-muted" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div>{errors.password && <span className="mt-1 block text-xs text-danger">{errors.password.message}</span>}</label><div className="flex items-center justify-between text-xs"><label className="flex items-center gap-2 text-text-secondary"><input type="checkbox" className="accent-primary" {...register("remember")} />Remember me</label><Link href="#" className="font-medium text-primary hover:text-blue-400">Forgot password?</Link></div><Button type="submit" className="w-full" disabled={isSubmitting || isLoading}>{isSubmitting ? "Signing in..." : "Sign in"}</Button>{message && <p className="rounded-md border border-danger/30 bg-danger/10 p-3 text-xs text-danger">{message}</p>}</form><div className="mt-8 border-t pt-6"><div className="flex items-center justify-between"><p className="text-xs font-semibold">Development accounts</p><span className="rounded-full bg-amber-500/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-warning">Mock only</span></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{developmentAccounts.map((mockUser) => <button key={mockUser.id} type="button" onClick={() => selectMockAccount(mockUser.email)} className="rounded-md border bg-surface-raised px-3 py-2 text-left transition-colors hover:border-primary/60 hover:bg-surface-soft"><span className="block text-xs font-medium">{roleLabels[mockUser.role]}</span><span className="mt-1 block truncate text-[10px] text-text-muted">{mockUser.name}</span></button>)}</div><p className="mt-3 text-[10px] text-text-muted">Select an account, then sign in with the prefilled development password.</p></div></div></div></main>;
}
