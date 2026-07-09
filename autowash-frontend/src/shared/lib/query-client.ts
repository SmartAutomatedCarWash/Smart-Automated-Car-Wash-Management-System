import { QueryClient } from "@tanstack/react-query";

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 10 * 60_000,
        retry: (failureCount, error) => {
          if (error instanceof Error && /401/.test(error.message)) {
            return false;
          }

          return failureCount < 1;
        },
        refetchOnMount: false,
        refetchOnReconnect: "always",
        refetchOnWindowFocus: false
      },
      mutations: {
        retry: false
      }
    }
  });
}
