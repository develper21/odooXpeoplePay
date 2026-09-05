import { apiResource } from "@/lib/api/client";
import { dataMode } from "@/lib/data-mode";
import { createMock, deleteMock, listMock, updateMock } from "@/lib/services/mock-store";
import type { CrudService } from "@/lib/services/types";

type StoreKey = "employees" | "contracts" | "schedules" | "attendance" | "allocations" | "timeOffRequests" | "salaryStructures" | "salaryRules" | "payruns" | "payslips" | "users";

export function createResourceService<T extends { id: string }>(key: StoreKey, apiPath: string): CrudService<T> {
  if (dataMode === "api") return apiResource<T>(apiPath) as CrudService<T>;
  return {
    list: async () => listMock(key) as unknown as T[],
    get: async (id) => { const item = (listMock(key) as unknown as T[]).find((record) => record.id === id); if (!item) throw new Error(`Mock record ${id} was not found`); return item; },
    create: async (input) => createMock(key, { ...input, id: `${key}-${Date.now()}` } as unknown as never) as unknown as T,
    update: async (id, input) => updateMock(key, id, input as never) as unknown as T,
    remove: async (id) => deleteMock(key, id),
  };
}
