import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

import type {
  ReactNode,
} from "react";

import {
  TechnicianApiError,
} from "../api/httpClient";

export const technicianQueryClient =
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        retry: (failureCount, error) => {
          if (
            error instanceof TechnicianApiError &&
            error.status >= 400 &&
            error.status < 500
          ) {
            return false;
          }

          return failureCount < 1;
        },
      },
      mutations: {
        retry: false,
      },
    },
  });

export function TechnicianQueryProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <QueryClientProvider
      client={technicianQueryClient}
    >
      {children}
    </QueryClientProvider>
  );
}
