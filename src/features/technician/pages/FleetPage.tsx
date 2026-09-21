import {
  type FormEvent,
  type ReactNode,
  useEffect,
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
  loadFleet,
  saveFleet,
  TECHNICIAN_HUB,
  type DroneStatus,
  type FleetDrone,
} from "../utils/fleetStorage";

import {
  loadTransitMissions,
  type TransitMission,
} from "../utils/transitMissionStorage";

type DroneForm = {
  model: string;
  status: DroneStatus;
  battery: string;
};

type StatusFilter =
  | "All status"
  | DroneStatus;

type BatteryFilter =
  | "All battery"
  | "Normal ≥ 40%"
  | "Low < 40%";

const initialForm: DroneForm = {
  model: "",
  status: "Available",
  battery: "100",
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

  const [
    drones,
    setDrones,
  ] = useState<FleetDrone[]>(
    loadFleet,
  );

  const [
    transitMissions,
    setTransitMissions,
  ] = useState<
    TransitMission[]
  >(loadTransitMissions);

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
    batteryFilter,
    setBatteryFilter,
  ] = useState<BatteryFilter>(
    "All battery",
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

  useEffect(() => {
    saveFleet(drones);
  }, [drones]);

  useEffect(() => {
    const syncTransitMissions =
      () => {
        setTransitMissions(
          loadTransitMissions(),
        );
      };

    window.addEventListener(
      "technician-transit-missions-updated",
      syncTransitMissions,
    );

    return () => {
      window.removeEventListener(
        "technician-transit-missions-updated",
        syncTransitMissions,
      );
    };
  }, []);

  /*
   * Hub Fleet only contains drones physically
   * confirmed at this technician's hub.
   *
   * Incoming / continuing missions are handled
   * in Transit missions.
   */
  const hubDrones = useMemo(
    () =>
      drones.filter(
        (drone) =>
          drone.location ===
          TECHNICIAN_HUB,
      ),
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

          const matchesBattery =
            batteryFilter ===
              "All battery" ||
            (batteryFilter ===
              "Low < 40%" &&
              drone.battery <
                40) ||
            (batteryFilter ===
              "Normal ≥ 40%" &&
              drone.battery >=
                40);

          return (
            matchesSearch &&
            matchesStatus &&
            matchesBattery
          );
        },
      );
    }, [
      hubDrones,
      searchQuery,
      statusFilter,
      batteryFilter,
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
      battery: String(
        drone.battery,
      ),
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

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!editingDroneId) {
      return;
    }

    const battery = Number(
      form.battery,
    );

    if (!form.model.trim()) {
      setFormError(
        "Please enter the drone model.",
      );

      return;
    }

    if (
      Number.isNaN(battery) ||
      battery < 0 ||
      battery > 100
    ) {
      setFormError(
        "Battery level must be between 0 and 100.",
      );

      return;
    }

    setDrones((current) =>
      current.map((drone) =>
        drone.id ===
        editingDroneId
          ? {
              ...drone,
              model:
                form.model.trim(),
              status:
                form.status,
              battery,
            }
          : drone,
      ),
    );

    closeModal();
  };

  const handleStatusChange = (
    droneId: string,
    status: DroneStatus,
  ) => {
    setDrones((current) =>
      current.map((drone) =>
        drone.id === droneId
          ? {
              ...drone,
              status,
            }
          : drone,
      ),
    );
  };

  const getBatteryServiceMission = (
    drone: FleetDrone,
  ) =>
    transitMissions.find(
      (mission) =>
        mission.currentDroneId ===
          drone.id &&
        mission.hub ===
          TECHNICIAN_HUB &&
        mission.status ===
          "At Hub" &&
        drone.battery <
          mission.requiredDepartureBatteryPct,
    );

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
      description={`Monitor drone readiness, technical status and battery level at ${TECHNICIAN_HUB}.`}
    >
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

          <DropdownSelect
            value={
              batteryFilter
            }
            onChange={(value) =>
              setBatteryFilter(
                value as BatteryFilter,
              )
            }
            options={[
              "All battery",
              "Normal ≥ 40%",
              "Low < 40%",
            ]}
            ariaLabel="Battery level"
            className="min-w-[170px]"
          />
        </div>

        {/* TABLE */}
        <CardContent className="p-0">
          <Table className="fleet-table table-fixed">
            <colgroup>
              <col className="w-[13%]" />
              <col className="w-[17%]" />
              <col className="w-[18%]" />
              <col className="w-[15%]" />
              <col className="w-[17%]" />
              <col className="w-[11%]" />
              <col className="w-[9%]" />
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
                  Battery
                </TableHead>

                <TableHead className="h-14 text-center !text-[var(--tech-text-secondary)]">
                  Service
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
                    const lowBattery =
                      drone.battery <
                      40;

                    const code =
                      getDroneDisplayCode(
                        drone,
                      );

                    const batteryServiceMission =
                      getBatteryServiceMission(
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

                        <TableCell className="text-center">
                          <div className="mx-auto w-[145px]">
                            <div className="mb-1.5 flex justify-between">
                              <span
                                className={
                                  lowBattery
                                    ? "text-[12px] font-semibold text-red-500"
                                    : "text-[12px] text-[var(--tech-muted)]"
                                }
                              >
                                {
                                  drone.battery
                                }
                                %
                              </span>

                              {lowBattery && (
                                <span className="text-[10px] font-semibold uppercase text-red-500">
                                  Low
                                </span>
                              )}
                            </div>

                            <div className="h-1 overflow-hidden rounded-full bg-[var(--tech-border)]">
                              <div
                                className={
                                  lowBattery
                                    ? "h-full rounded-full bg-red-500"
                                    : "h-full rounded-full bg-orange-500"
                                }
                                style={{
                                  width: `${drone.battery}%`,
                                }}
                              />
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="text-center">
                          {batteryServiceMission ? (
                            <div className="mx-auto max-w-[180px]">
                              <p className="text-[12px] font-semibold text-orange-500">
                                Battery service
                              </p>

                              <p className="mt-1 text-[11px] text-[var(--tech-muted)]">
                                {drone.battery}% → required{" "}
                                {batteryServiceMission.requiredDepartureBatteryPct}%
                              </p>
                            </div>
                          ) : (
                            <span className="text-[12px] text-[var(--tech-subtle)]">
                              —
                            </span>
                          )}
                        </TableCell>

                        <TableCell className="text-center text-[12px] text-[var(--tech-muted)]">
                          {
                            TECHNICIAN_HUB
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
                    colSpan={7}
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
                      required
                      value={
                        form.model
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,
                            model:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                      className="tech-control h-10 w-full px-3 !text-[13px]"
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

                    <Field label="Battery level">
                      <div className="relative">
                        <input
                          required
                          type="number"
                          min={0}
                          max={100}
                          value={
                            form.battery
                          }
                          onChange={(
                            event,
                          ) =>
                            setForm(
                              (
                                current,
                              ) => ({
                                ...current,
                                battery:
                                  event
                                    .target
                                    .value,
                              }),
                            )
                          }
                          className="tech-control h-10 w-full px-3 pr-9 !text-[13px]"
                        />

                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-[var(--tech-muted)]">
                          %
                        </span>
                      </div>
                    </Field>
                  </div>

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
