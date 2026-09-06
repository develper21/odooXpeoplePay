"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useUser, useUpdateUser } from "@/hooks/use-data";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingState, ErrorState } from "@/components/shared/states";
import { UserForm } from "@/components/users/user-form";
import { Toast } from "@/components/ui/toast";
import type { User } from "@/types/domain";

export default function EditUserPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: userItem, isLoading, isError } = useUser(id);
  const updateUserMutation = useUpdateUser();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (isLoading) return <LoadingState />;
  if (isError || !userItem)
    return <ErrorState message="User record not found." />;

  const handleSubmit = async (data: Omit<User, "id">) => {
    await updateUserMutation.mutateAsync({ id, input: data });
    setToastMessage("User profile and role assignment updated successfully.");
    setTimeout(() => {
      router.push(`/users/${id}`);
    }, 600);
  };

  return (
    <>
      {toastMessage && <Toast message={toastMessage} />}
      <PageHeader
        title={`Edit · ${userItem.name || `${(userItem as any).firstName || ""} ${(userItem as any).lastName || ""}`.trim() || userItem.email || "User"}`}
        description="Update user contact details, role assignment, and linked employee profile."
      />

      <UserForm
        initialData={userItem}
        onSubmit={handleSubmit}
        isSubmitting={updateUserMutation.isPending}
      />
    </>
  );
}
