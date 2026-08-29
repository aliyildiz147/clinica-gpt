import { useQuery } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import type { OkResponse, User } from "@/lib/types";

export function useMe() {
  return useQuery<User>({
    queryKey: ["me"],
    queryFn: () => apiGet<User>("/auth/me"),
    retry: false,
    staleTime: 60_000,
  });
}

// Call after every successful login so no previous account's cache survives.
export function beginSession(): void {
  queryClient.clear();
}

// Single sign-out path: clears the server session AND the react-query cache.
export async function endSession(): Promise<void> {
  try {
    await apiPost<OkResponse>("/auth/logout");
  } finally {
    queryClient.clear();
    window.location.href = "/login";
  }
}
