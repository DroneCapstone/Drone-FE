import {
  useMemo,
  useState,
} from "react";

import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";


import {
  Card,
  CardContent,
} from "@/components/shadcn/ui/card";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/shadcn/ui/table";

import {
  DropdownSelect,
} from "@/components/ui/DropdownSelect";

import {
  TechnicianPageShell,
} from "../components/TechnicianPageShell";

import {
  TechnicianStatusBadge,
} from "../components/TechnicianStatusBadge";

import {
  TECHNICIAN_HUB,
  type DroneStatus,
} from "../utils/fleetStorage";

import {
  useFleetQuery,
} from "../hooks/useFleetQueries";

type StatusFilter =
  | "All status"
  | DroneStatus;


// Client-side pagination: GET Fleet already returns the drones at this hub.
const DRONES_PER_PAGE = 9;

type PageItem = number | "left-ellipsis" | "right-ellipsis";

function getPageItems(currentPage: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const keep = new Set<number>([
    1,
    2,
    totalPages - 1,
    totalPages,
    currentPage - 1,
    currentPage,
    currentPage + 1,
  ]);
  const pages = Array.from(keep)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);

  const items: PageItem[] = [];
  pages.forEach((page, index) => {
    if (index > 0 && page - pages[index - 1] > 1) {
      items.push(page < currentPage ? "left-ellipsis" : "right-ellipsis");
    }
    items.push(page);
  });
  return items;
}


export function FleetPage() {
  const navigate = useNavigate();

  const fleetQuery =
    useFleetQuery();

  const drones =
    fleetQuery.data ?? [];

  const hubLabel =
    drones[0]?.location ||
    TECHNICIAN_HUB;


  const [
    searchQuery,
    setSearchQuery,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<StatusFilter>(
    "All status",
  );

  const [page, setPage] = useState(1);


  const queryError =
    fleetQuery.error instanceof Error
      ? fleetQuery.error.message
      : "";



  /*
   * Hub Fleet only contains drones physically
   * confirmed at this technician's hub.
   *
   * Incoming / continuing missions are handled
   * in Transit missions.
   */
  const hubDrones = useMemo(
    () => drones,
    [drones],
  );

  const filteredDrones =
    useMemo(() => {
      const query =
        searchQuery
          .trim()
          .toLowerCase();

      return hubDrones.filter(
        (drone) => {
          const matchesSearch =
            !query ||
            drone.id.toLowerCase().includes(query) ||
            drone.name.toLowerCase().includes(query) ||
            drone.model.toLowerCase().includes(query);

          const matchesStatus =
            statusFilter ===
              "All status" ||
            drone.status ===
              statusFilter;


          return (
            matchesSearch &&
            matchesStatus
          );
        },
      );
    }, [
      hubDrones,
      searchQuery,
      statusFilter,
    ]);



  const totalPages = Math.max(1, Math.ceil(filteredDrones.length / DRONES_PER_PAGE));
  // Clamp immediately if fresh API data makes the current page disappear.
  const currentPage = Math.min(page, totalPages);
  const firstIndex = (currentPage - 1) * DRONES_PER_PAGE;
  const pagedDrones = filteredDrones.slice(firstIndex, firstIndex + DRONES_PER_PAGE);
  const pageItems = getPageItems(currentPage, totalPages);
  const rangeStart = filteredDrones.length === 0 ? 0 : firstIndex + 1;
  const rangeEnd = Math.min(firstIndex + DRONES_PER_PAGE, filteredDrones.length);

  const actionButtonClass =
    "relative inline-flex h-8 w-8 items-center justify-center rounded-md " +
    "text-[var(--tech-muted)] transition-colors duration-150 " +
    "hover:text-orange-500 " +
    "after:absolute after:bottom-[2px] after:left-1/2 after:h-px after:w-4 " +
    "after:-translate-x-1/2 after:scale-x-0 after:bg-orange-500 " +
    "after:transition-transform after:duration-150 hover:after:scale-x-100";

  return (
    <TechnicianPageShell
      title="Hub fleet"
      description={``}
    >
      {queryError && (
        <div className="mb-4 rounded-md border border-red-500/25 px-4 py-3 text-[13px] text-red-500">
          {queryError}
          <button type="button" onClick={() => void fleetQuery.refetch()} className="ml-3 font-semibold underline">Retry</button>
        </div>
      )}

      <Card className="overflow-hidden rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-none">
        {/* FILTERS */}
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--tech-border)] px-4 py-4">
          <div className="relative min-w-[280px] flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--tech-subtle)]"
            />

            <input
              type="search"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search drone ID or model..."
              className="tech-control h-10 w-full pl-9 pr-3 !text-[13px]"
            />
          </div>

          <DropdownSelect
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value as StatusFilter);
              setPage(1);
            }}
            options={[
              "All status",
              "Available",
              "Maintenance",
            ]}
            ariaLabel="Drone status"
            className="min-w-[190px]"
          />
        </div>

        {/* TABLE */}
        <CardContent className="p-0">
          <div className="overflow-x-auto">
          <Table className="fleet-table table-fixed min-w-[820px]">
            <colgroup>
              <col className="w-[7%]" />
              <col className="w-[19%]" />
              <col className="w-[22%]" />
              <col className="w-[19%]" />
              <col className="w-[22%]" />
              <col className="w-[11%]" />
            </colgroup>

            <TableHeader>
              <TableRow className="fleet-header-row hover:bg-transparent">
                <TableHead className="h-14 text-center !text-[var(--tech-text-secondary)]">
                  STT
                </TableHead>

                <TableHead className="h-14 text-center !text-[var(--tech-text-secondary)]">
                  Drone ID
                </TableHead>

                <TableHead className="h-14 text-center !text-[var(--tech-text-secondary)]">
                  Model
                </TableHead>

                <TableHead className="h-14 text-center !text-[var(--tech-text-secondary)]">
                  Status
                </TableHead>

                <TableHead className="h-14 text-center !text-[var(--tech-text-secondary)]">
                  Hub
                </TableHead>

                <TableHead className="h-14 text-center !text-[var(--tech-text-secondary)]">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {pagedDrones.length >
              0 ? (
                pagedDrones.map(
                  (drone, index) => {
                    return (
                      <TableRow
                        key={drone.id}
                        className="fleet-data-row hover:bg-[var(--tech-surface-2)]"
                      >
                        <TableCell className="h-[72px] text-center text-[13px] tabular-nums text-[var(--tech-muted)]">
                          {firstIndex + index + 1}
                        </TableCell>

                        <TableCell className="h-[72px] text-center">
                          <strong className="text-[15px] font-semibold text-[var(--tech-text)]">
                            {drone.id}
                          </strong>
                        </TableCell>

                        <TableCell className="text-center text-[13px] text-[var(--tech-muted)]">
                          {
                            drone.model
                          }
                        </TableCell>

                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            <TechnicianStatusBadge
                              status={
                                drone.status === "Maintenance"
                                  ? "maintenance"
                                  : "available"
                              }
                            />
                          </div>
                        </TableCell>

                        <TableCell className="text-center text-[12px] text-[var(--tech-muted)]">
                          {
                            drone.location || TECHNICIAN_HUB
                          }
                        </TableCell>

                        <TableCell>
                          <div className="flex justify-center gap-2">
                            <button
                              type="button"
                              title="View drone details"
                              onClick={() =>
                                navigate(
                                  `/technician/fleet/${drone.id}`,
                                )
                              }
                              className={
                                actionButtonClass
                              }
                            >
                              <ArrowUpRight
                                size={15}
                              />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  },
                )
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-32 text-center text-[13px] text-[var(--tech-subtle)]"
                  >
                    {fleetQuery.isPending
                      ? "Loading drones..."
                      : fleetQuery.isError
                        ? "Unable to load Hub Fleet."
                        : hubDrones.length > 0
                          ? "No drones match the current search or status filter."
                          : `No drones are currently stored at ${hubLabel}.`}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>

          {/* Pagination is applied after search/status filtering. */}
          {!fleetQuery.isPending && !fleetQuery.isError && filteredDrones.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--tech-border)] px-4 py-3 sm:px-5">
              <p className="text-[12px] tabular-nums text-[var(--tech-muted)]">
                Showing {rangeStart}–{rangeEnd} of {filteredDrones.length} drones
              </p>
              {totalPages > 1 && (
                <nav className="flex flex-wrap items-center gap-1.5" aria-label="Hub fleet pagination">
                  <button
                    type="button"
                    aria-label="Previous page"
                    disabled={currentPage === 1}
                    onClick={() => setPage(Math.max(1, currentPage - 1))}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--tech-border)] text-[var(--tech-text-secondary)] hover:border-orange-500/50 hover:text-orange-500 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  {pageItems.map((item) =>
                    typeof item === "number" ? (
                      <button
                        key={item}
                        type="button"
                        aria-label={`Page ${item}`}
                        aria-current={currentPage === item ? "page" : undefined}
                        onClick={() => setPage(item)}
                        className={`h-8 min-w-8 rounded-md border px-2 text-[12px] font-semibold tabular-nums transition-colors ${
                          currentPage === item
                            ? "border-orange-500 bg-orange-500 text-black"
                            : "border-[var(--tech-border)] text-[var(--tech-text-secondary)] hover:border-orange-500/50 hover:text-orange-500"
                        }`}
                      >
                        {item}
                      </button>
                    ) : (
                      <span key={item} className="px-1 text-[12px] text-[var(--tech-muted)]" aria-hidden="true">…</span>
                    ),
                  )}
                  <button
                    type="button"
                    aria-label="Next page"
                    disabled={currentPage === totalPages}
                    onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--tech-border)] text-[var(--tech-text-secondary)] hover:border-orange-500/50 hover:text-orange-500 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronRight size={15} />
                  </button>
                </nav>
              )}
            </div>
          )}
        </CardContent>
      </Card>

    </TechnicianPageShell>
  );
}
