import type { QueryClient } from "@tanstack/react-query";
import { technicianQueryKeys } from "./queryKeys";

/**
 * Only call AFTER the dispatch request was accepted by Backend.
 * All inventories remain server-authoritative: backend must mark the flying
 * drone and installed battery no longer stored at the departure hub.
 * Invalidate both lists and detail caches so the departure becomes visible
 * everywhere (Origin AND Relay). The removed relay battery remains in the
 * hub when the swap endpoint recorded it there.
 */
export function invalidateAfterTechnicianDispatch(queryClient: QueryClient) {
  const keys = [
    technicianQueryKeys.outbound(),
    technicianQueryKeys.transit(),
    technicianQueryKeys.missions(),
    technicianQueryKeys.fleet(),
    technicianQueryKeys.batteries(),
    technicianQueryKeys.confirmations(),
    technicianQueryKeys.notifications(),
    technicianQueryKeys.unreadCount(),
    [...technicianQueryKeys.transit(), "history"],
    ["technician", "drone"],
    ["technician", "battery"],
  ];
  // Refetch visible screens, mark inactive screens stale so they refetch on visit.
  void Promise.all(keys.map((queryKey) =>
    queryClient.invalidateQueries({ queryKey, refetchType: "active" }),
  ));
}
