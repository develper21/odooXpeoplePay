"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCreateUser } from "@/hooks/use-data";
import { PageHeader } from "@/components/shared/page-header";
import { UserForm } from "@/components/users/user-form";
import { Toast } from "@/components/ui/toast";
import type { User } from "@/types/domain";

export default function NewUserPage() {
  const router = useRouter();
  const createUserMutation = useCreateUser();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleSubmit = async (data: Omit<User, "id">) => {
    const newUser = await createUserMutation.mutateAsync(data);
    setToastMessage(`User account for ${newUser.name} created successfully.`);
    setTimeout(() => {
      router.push(`/users/${newUser.id}`);
    }, 600);
  };

  return (
    <>
      {toastMessage && <Toast message={toastMessage} />}
      <PageHeader
        title="Create New User"
        description="Register a new system user identity and configure their operational role."
      />

      <UserForm
        onSubmit={handleSubmit}
        isSubmitting={createUserMutation.isPending}
      />
    </>
  );
}
