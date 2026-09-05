const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";

export async function apiClient<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  if (!response.ok) throw new Error(`API request failed: ${response.status}`);
  return response.json() as Promise<T>;
}

export const apiResource = <T>(path: string) => ({
  list: () => apiClient<T[]>(path),
  get: (id: string) => apiClient<T>(`${path}/${id}`),
  create: (input: Partial<T>) => apiClient<T>(path, { method: "POST", body: JSON.stringify(input) }),
  update: (id: string, input: Partial<T>) => apiClient<T>(`${path}/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  remove: (id: string) => apiClient<void>(`${path}/${id}`, { method: "DELETE" }),
});
