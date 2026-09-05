"use client";

import { useRouter } from "next/navigation";
import { useCreateSchedule } from "@/hooks/use-data";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ScheduleForm } from "@/components/schedules/schedule-form";
import type { WorkingSchedule } from "@/types/domain";

export default function NewSchedulePage() { const router = useRouter(); const mutation = useCreateSchedule(); return <><PageHeader title="New Working Schedule" description="Define the expected weekly working pattern." /><Card><CardContent className="p-5 sm:p-7"><ScheduleForm submitting={mutation.isPending} onCancel={() => router.back()} onSubmit={async (values) => { await mutation.mutateAsync(values as Omit<WorkingSchedule, "id">); router.push("/schedules"); }} /></CardContent></Card>{mutation.isError && <p className="mt-4 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm text-danger">Schedule could not be created.</p>}</>; }
