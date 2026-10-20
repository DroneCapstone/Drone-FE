import {
  useMemo,
  useState,
} from "react";

import {
  ArrowUpRight,
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
      description={`Drones physically stored at ${hubLabel}.`}
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
              onChange={(event) =>
                setSearchQuery(
                  event.target
                    .value,
                )
              }
              placeholder="Search drone ID or model..."
              className="tech-control h-10 w-full pl-9 pr-3 !text-[13px]"
            />
          </div>

          <DropdownSelect
            value={statusFilter}
            onChange={(value) =>
              setStatusFilter(
                value as StatusFilter,
              )
            }
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
          <Table className="fleet-table table-fixed">
            <colgroup>
              <col className="w-[18%]" />
              <col className="w-[24%]" />
              <col className="w-[24%]" />
              <col className="w-[20%]" />
              <col className="w-[14%]" />
            </colgroup>

            <TableHeader>
              <TableRow className="fleet-header-row hover:bg-transparent">
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
              {filteredDrones.length >
              0 ? (
                filteredDrones.map(
                  (drone) => {
                    return (
                      <TableRow
                        key={
                          drone.id
                        }
                        className="fleet-data-row hover:bg-[var(--tech-surface-2)]"
                      >
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
                    colSpan={5}
                    className="h-32 text-center text-[13px] text-[var(--tech-subtle)]"
                  >
                    {fleetQuery.isPending
                      ? "Loading drones..."
                      : fleetQuery.isError
                        ? "Unable to load Hub Fleet."
                        : `No drones are currently assigned to ${TECHNICIAN_HUB}.`}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>

    
      </Card>

    </TechnicianPageShell>
  );
}
