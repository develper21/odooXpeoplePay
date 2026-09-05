"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ConfirmationDialog({ open, title, message, confirmLabel = "Confirm", onConfirm, onCancel, busy }: { open: boolean; title: string; message: string; confirmLabel?: string; onConfirm: () => void; onCancel: () => void; busy?: boolean }) { if (!open) return null; return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" role="presentation"><div role="dialog" aria-modal="true" aria-labelledby="confirmation-title" className="w-full max-w-md rounded-lg border bg-surface p-6 shadow-2xl"><div className="flex items-start gap-3"><span className="rounded-md bg-danger/10 p-2 text-danger"><AlertTriangle className="size-5" /></span><div><h2 id="confirmation-title" className="font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-text-secondary">{message}</p></div></div><div className="mt-6 flex justify-end gap-3"><Button variant="secondary" onClick={onCancel}>Cancel</Button><Button variant="danger" onClick={onConfirm} disabled={busy}>{busy ? "Deleting..." : confirmLabel}</Button></div></div></div>; }
