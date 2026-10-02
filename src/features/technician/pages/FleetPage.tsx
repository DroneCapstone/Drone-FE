import {
  type FormEvent,
  type ReactNode,
  useMemo,
  useState,
} from "react";

import {
  ArrowUpRight,
  Pencil,
  Search,
  X,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import {
  Button,
} from "@/components/shadcn/ui/button";

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
  TECHNICIAN_HUB,
  type DroneStatus,
  type FleetDrone,
} from "../utils/fleetStorage";

import {
  useFleetQuery,
  useUpdateDroneStatusMutation,
} from "../hooks/useFleetQueries";

type DroneForm = {
  model: string;
  status: DroneStatus;
};

type StatusFilter =
  | "All status"
  | DroneStatus;


const initialForm: DroneForm = {
  model: "",
  status: "Available",
};

function getDroneDisplayCode(
  drone: FleetDrone,
) {
  const prefix =
    drone.name
      .match(/[A-Za-z]+/)?.[0]
      ?.toUpperCase() ??
    "DR";

  const idMatch =
    drone.id.match(/(\d+)$/);

  if (!idMatch) {
    return drone.name;
  }

  const number = Number(
    idMatch[1],
  );

  if (Number.isNaN(number)) {
    return drone.name;
  }

  return `${prefix}-${String(
    number,
  ).padStart(2, "0")}`;
}

export function FleetPage() {
  const navigate = useNavigate();

  const fleetQuery =
    useFleetQuery();

  const updateStatusMutation =
    useUpdateDroneStatusMutation();

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


  const [
    modalOpen,
    setModalOpen,
  ] = useState(false);

  const [
    editingDroneId,
    setEditingDroneId,
  ] = useState<string | null>(
    null,
  );

  const [
    form,
    setForm,
  ] = useState<DroneForm>(
    initialForm,
  );

  const [
    formError,
    setFormError,
  ] = useState("");

  const [apiError, setApiError] = useState("");

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
          const code =
            getDroneDisplayCode(
              drone,
            ).toLowerCase();

          const matchesSearch =
            !query ||
            code.includes(
              query,
            ) ||
            drone.id
              .toLowerCase()
              .includes(query) ||
            drone.model
              .toLowerCase()
              .includes(query);

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

  const editingDrone =
    editingDroneId
      ? drones.find(
          (drone) =>
            drone.id ===
            editingDroneId,
        )
      : undefined;

  const openEditModal = (
    drone: FleetDrone,
  ) => {
    setEditingDroneId(
      drone.id,
    );

    setForm({
      model: drone.model,
      status: drone.status,
    });

    setFormError("");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingDroneId(null);
    setForm(initialForm);
    setFormError("");
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!editingDroneId) return;

    try {
      setFormError("");
      await updateStatusMutation.mutateAsync({
        droneId: editingDroneId,
        status: form.status,
      });
      closeModal();
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Unable to update drone status.",
      );
    }
  };

  const handleStatusChange = async (
    droneId: string,
    status: DroneStatus,
  ) => {
    try {
      await updateStatusMutation.mutateAsync({
        droneId,
        status,
      });
    } catch (error) {
      setApiError(
        error instanceof Error
          ? error.message
          : "Unable to update drone status.",
      );
    }
  };


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
      {(apiError || queryError) && (
        <div className="mb-4 rounded-md border border-red-500/25 px-4 py-3 text-[13px] text-red-500">
          {apiError || queryError}
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
              placeholder="Search drone code, ID or model..."
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
                  Drone
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
                    const code =
                      getDroneDisplayCode(
                        drone,
                      );


                    return (
                      <TableRow
                        key={
                          drone.id
                        }
                        className="fleet-data-row hover:bg-[var(--tech-surface-2)]"
                      >
                        <TableCell className="h-[72px] text-center">
                          <strong className="text-[15px] font-semibold text-[var(--tech-text)]">
                            {code}
                          </strong>
                        </TableCell>

                        <TableCell className="text-center text-[13px] text-[var(--tech-muted)]">
                          {
                            drone.model
                          }
                        </TableCell>

                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            <DropdownSelect
                              value={
                                drone.status
                              }
                              onChange={(
                                value,
                              ) =>
                                handleStatusChange(
                                  drone.id,
                                  value as DroneStatus,
                                )
                              }
                              options={[
                                "Available",
                                "Maintenance",
                              ]}
                              ariaLabel={`Status for ${code}`}
                              className="w-[205px] min-w-[205px]"
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
                              title="Edit drone"
                              onClick={() =>
                                openEditModal(
                                  drone,
                                )
                              }
                              className={
                                actionButtonClass
                              }
                            >
                              <Pencil
                                size={14}
                              />
                            </button>

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
                    No drones are currently assigned to{" "}
                    {
                      TECHNICIAN_HUB
                    }
                    .
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>

    
      </Card>

      {/* EDIT DRONE */}
      {modalOpen &&
        editingDrone && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4">
            <div className="w-full max-w-[520px] overflow-hidden rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-2xl">
              <div className="flex justify-between border-b border-[var(--tech-border)] px-6 py-5">
                <div>
                  <h2 className="text-[18px] font-semibold text-[var(--tech-text)]">
                    Edit drone
                  </h2>

                  <p className="mt-1 text-[13px] text-[var(--tech-muted)]">
                    Update the current technical state of this drone.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    closeModal
                  }
                  className="rounded-md p-1.5 text-[var(--tech-muted)] transition-colors hover:text-orange-500"
                >
                  <X size={18} />
                </button>
              </div>

              <form
                onSubmit={
                  handleSubmit
                }
              >
                <div className="space-y-4 px-6 py-5">
                  <Field label="Drone">
                    <input
                      disabled
                      value={
                        getDroneDisplayCode(
                          editingDrone,
                        )
                      }
                      className="tech-control h-10 w-full cursor-not-allowed px-3 !text-[13px] opacity-70"
                    />
                  </Field>

                  <Field label="Model">
                    <input
                      disabled
                      value={form.model}
                      className="tech-control h-10 w-full cursor-not-allowed px-3 !text-[13px] opacity-70"
                    />
                  </Field>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Status">
                      <DropdownSelect
                        value={
                          form.status
                        }
                        onChange={(
                          value,
                        ) =>
                          setForm(
                            (
                              current,
                            ) => ({
                              ...current,
                              status:
                                value as DroneStatus,
                            }),
                          )
                        }
                        options={[
                          "Available",
                          "Maintenance",
                        ]}
                        ariaLabel="Drone status"
                        className="w-full min-w-0"
                      />
                    </Field>

                    <Field label="Installed battery">
                      <input
                        disabled
                        value={
                          editingDrone.installedBatteryId ??
                          "Not installed"
                        }
                        className="tech-control h-10 w-full cursor-not-allowed px-3 !text-[13px] opacity-70"
                      />
                    </Field>
                  </div>

                  <p className="-mt-1 text-[11px] leading-5 text-[var(--tech-muted)]">
                    Hub-stored drones normally have no battery installed. Batteries are managed separately in Battery management.
                  </p>

                  <Field label="Assigned hub">
                    <input
                      disabled
                      value={
                        TECHNICIAN_HUB
                      }
                      className="tech-control h-10 w-full cursor-not-allowed px-3 !text-[13px] opacity-70"
                    />
                  </Field>

                  {formError && (
                    <p className="text-[12px] text-red-500">
                      {
                        formError
                      }
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-2 border-t border-[var(--tech-border)] px-6 py-4">
                  <Button
                    type="button"
                    onClick={
                      closeModal
                    }
                    className="
                      h-9 rounded-md
                      border border-[var(--tech-border)]
                      !bg-transparent px-4
                      text-[13px]
                      text-[var(--tech-text-secondary)]
                      hover:!border-orange-500/50
                      hover:!bg-transparent
                      hover:!text-orange-500
                    "
                  >
                    Cancel
                  </Button>

                  <Button
                    type="submit"
                    className="h-9 rounded-md bg-orange-500 px-4 text-[13px] font-medium text-black hover:bg-orange-600"
                  >
                    Save changes
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
    </TechnicianPageShell>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium uppercase tracking-[0.08em] text-[var(--tech-muted)]">
        {label}
      </span>

      {children}
    </label>
  );
}
