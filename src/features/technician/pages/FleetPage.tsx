import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AnimatePresence,
  motion,
} from "framer-motion";

import {
  ArrowUpRight,
  Pencil,
  Search,
  Trash2,
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

type DroneForm = {
  model: string;
  status: DroneStatus;
  battery: string;
};

type BatteryFilter =
  | "All battery"
  | "Normal ≥ 40%"
  | "Low < 40%";

type LocationFilter =
  | "All location"
  | "At my hub"
  | "Incoming";

type StatusFilter =
  | "All status"
  | DroneStatus;

const initialForm: DroneForm = {
  model: "",
  status: "Available",
  battery: "100",
};

/*
 * Display rule:
 * DR-002 + type/name prefix CX -> CX-02
 * DR-014 + type/name prefix AX -> AX-14
 */
function getDroneDisplayCode(
  drone: FleetDrone,
) {
  const prefixMatch =
    drone.name.match(/[A-Za-z]+/);

  const prefix =
    prefixMatch?.[0]?.toUpperCase() ??
    "DR";

  const idNumberMatch =
    drone.id.match(/(\d+)$/);

  if (!idNumberMatch) {
    return drone.name;
  }

  const numericId = Number(
    idNumberMatch[1],
  );

  if (Number.isNaN(numericId)) {
    return drone.name;
  }

  return `${prefix}-${String(
    numericId,
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
    locationFilter,
    setLocationFilter,
  ] =
    useState<LocationFilter>(
      "All location",
    );

  const [
    batteryFilter,
    setBatteryFilter,
  ] =
    useState<BatteryFilter>(
      "All battery",
    );

  const [
    modalOpen,
    setModalOpen,
  ] = useState(false);

  const [
    editingDroneId,
    setEditingDroneId,
  ] = useState<
    string | null
  >(null);

  const [
    form,
    setForm,
  ] =
    useState<DroneForm>(
      initialForm,
    );

  const [
    formError,
    setFormError,
  ] = useState("");

  const [
    deleteConfirmTarget,
    setDeleteConfirmTarget,
  ] =
    useState<FleetDrone | null>(
      null,
    );

  useEffect(() => {
    saveFleet(drones);
  }, [drones]);

  const isIncomingToMyHub = (
    drone: FleetDrone,
  ) => {
    const location =
      drone.location.toLowerCase();

    const hub =
      TECHNICIAN_HUB.toLowerCase();

    return (
      location.includes(hub) &&
      (location.startsWith(
        "heading to",
      ) ||
        location.startsWith(
          "en route",
        ) ||
        location.startsWith(
          "in transit",
        ))
    );
  };

  const isAtMyHub = (
    drone: FleetDrone,
  ) =>
    drone.location ===
    TECHNICIAN_HUB;

  const hubDrones = useMemo(
    () =>
      drones.filter(
        (drone) =>
          isAtMyHub(drone) ||
          isIncomingToMyHub(
            drone,
          ),
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
          const incoming =
            isIncomingToMyHub(
              drone,
            );

          const displayCode =
            getDroneDisplayCode(
              drone,
            ).toLowerCase();

          const matchesSearch =
            !query ||
            displayCode.includes(
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

          const matchesLocation =
            locationFilter ===
              "All location" ||
            (locationFilter ===
              "At my hub" &&
              !incoming) ||
            (locationFilter ===
              "Incoming" &&
              incoming);

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
            matchesLocation &&
            matchesBattery
          );
        },
      );
    }, [
      hubDrones,
      searchQuery,
      statusFilter,
      locationFilter,
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

  const handleDelete = (
    drone: FleetDrone,
  ) => {
    setDeleteConfirmTarget(
      drone,
    );
  };

  const confirmDelete = () => {
    if (!deleteConfirmTarget) {
      return;
    }

    setDrones((current) =>
      current.filter(
        (item) =>
          item.id !==
          deleteConfirmTarget.id,
      ),
    );

    setDeleteConfirmTarget(
      null,
    );
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
      title="Fleet"
      description={`Manage drones at ${TECHNICIAN_HUB} and monitor incoming drones.`}
    >
      <Card className="overflow-hidden rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-none">
        {/* SEARCH + FILTERS */}
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--tech-border)] px-4 py-4">
          <div className="relative min-w-[260px] flex-1">
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
              className="tech-control h-9 w-full pl-9 pr-3 !text-[13px]"
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
              "Battery Replacement",
            ]}
            ariaLabel="Drone status"
            className="min-w-[160px]"
          />

          <DropdownSelect
            value={
              locationFilter
            }
            onChange={(value) =>
              setLocationFilter(
                value as LocationFilter,
              )
            }
            options={[
              "All location",
              "At my hub",
              "Incoming",
            ]}
            ariaLabel="Drone location"
            className="min-w-[160px]"
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
            className="min-w-[155px]"
          />
        </div>

        {/* TABLE */}
        <CardContent className="p-0">
          <Table className="fleet-table table-fixed">
            <colgroup>
              <col className="w-[15%]" />
              <col className="w-[17%]" />
              <col className="w-[18%]" />
              <col className="w-[17%]" />
              <col className="w-[21%]" />
              <col className="w-[12%]" />
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
                  Hub / Location
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

                    const incoming =
                      isIncomingToMyHub(
                        drone,
                      );

                    const displayCode =
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
                            {
                              displayCode
                            }
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
                                "Battery Replacement",
                              ]}
                              ariaLabel={`Status for ${displayCode}`}
                              className="w-[165px] min-w-0"
                            />
                          </div>
                        </TableCell>

                        <TableCell className="text-center">
                          <div className="mx-auto w-[135px]">
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
                          {incoming ? (
                            <div className="flex flex-col items-center">
                              <span className="text-[12px] font-medium text-orange-500">
                                Heading
                                to{" "}
                                {
                                  TECHNICIAN_HUB
                                }
                              </span>

                              <span className="mt-1 rounded border border-orange-900/60 bg-orange-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-orange-500">
                                Incoming
                              </span>
                            </div>
                          ) : (
                            <span className="text-[12px] text-[var(--tech-muted)]">
                              {
                                TECHNICIAN_HUB
                              }
                            </span>
                          )}
                        </TableCell>

                        <TableCell>
                          <div className="flex justify-center gap-2">
                            {!incoming && (
                              <>
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
                                    size={
                                      14
                                    }
                                  />
                                </button>

                                <button
                                  type="button"
                                  title="Delete drone"
                                  onClick={() =>
                                    handleDelete(
                                      drone,
                                    )
                                  }
                                  className={
                                    actionButtonClass
                                  }
                                >
                                  <Trash2
                                    size={
                                      14
                                    }
                                  />
                                </button>
                              </>
                            )}

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
                                size={
                                  15
                                }
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
                    No drones
                    currently
                    assigned or
                    heading to{" "}
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
                    Update the current drone information.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    closeModal
                  }
                  className="rounded-md p-1.5 text-[var(--tech-muted)] transition-colors hover:text-orange-500"
                >
                  <X
                    size={18}
                  />
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
                      placeholder="DJI Matrice 350"
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
                          "Battery Replacement",
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

      {/* DELETE CONFIRMATION */}
      <AnimatePresence>
        {deleteConfirmTarget && (
          <motion.div
            initial={{
              x: 420,
              opacity: 0,
            }}
            animate={{
              x: 0,
              opacity: 1,
            }}
            exit={{
              x: 420,
              opacity: 0,
            }}
            transition={{
              duration: 0.22,
              ease: "easeOut",
            }}
            className="
              fixed bottom-6 right-6 z-[9999]
              w-[360px]
              overflow-hidden
              rounded-lg
              border border-[var(--tech-border)]
              bg-[var(--tech-surface)]
              p-4
              shadow-2xl
            "
          >
            <svg
              className="pointer-events-none absolute inset-0 z-20 h-full w-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <linearGradient
                  id="delete-confirm-border-gradient"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <stop
                    offset="0%"
                    stopColor="rgba(255,123,0,0)"
                  />

                  <stop
                    offset="18%"
                    stopColor="rgba(255,123,0,0.35)"
                  />

                  <stop
                    offset="55%"
                    stopColor="rgba(255,123,0,1)"
                  />

                  <stop
                    offset="100%"
                    stopColor="rgba(255,123,0,0)"
                  />
                </linearGradient>
              </defs>

              <motion.rect
                x="0.8"
                y="0.8"
                width="98.4"
                height="98.4"
                rx="2.6"
                ry="2.6"
                fill="none"
                stroke="url(#delete-confirm-border-gradient)"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
                initial={{
                  pathLength: 0,
                  pathOffset: 0,
                  opacity: 0,
                }}
                animate={{
                  pathLength: [
                    0,
                    0.18,
                    0.18,
                    0,
                  ],
                  pathOffset: [
                    0,
                    0,
                    0.82,
                    1,
                  ],
                  opacity: [
                    0,
                    1,
                    1,
                    0,
                  ],
                }}
                transition={{
                  duration: 3,
                  times: [
                    0,
                    0.14,
                    0.82,
                    1,
                  ],
                  ease:
                    "easeInOut",
                  repeat:
                    Infinity,
                  repeatType:
                    "loop",
                }}
              />
            </svg>

            <div className="relative z-10 flex items-start gap-3">
              <div
                className="
                  mt-0.5
                  flex h-8 w-8
                  shrink-0
                  items-center
                  justify-center
                  rounded-md
                  border border-orange-500/30
                  bg-orange-500/10
                  text-orange-500
                "
              >
                <Trash2
                  size={15}
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-[var(--tech-text)]">
                  Confirm drone deletion
                </p>

                <p className="mt-1 text-[12px] leading-4 text-[var(--tech-muted)]">
                  Delete{" "}
                  {getDroneDisplayCode(
                    deleteConfirmTarget,
                  )}{" "}
                  from the fleet?
                </p>

                <p className="mt-1 text-[11px] text-[var(--tech-subtle)]">
                  This action removes the drone from your current fleet list.
                </p>

                <div className="mt-4 flex justify-end gap-2">
                  <Button
                    type="button"
                    onClick={() =>
                      setDeleteConfirmTarget(
                        null,
                      )
                    }
                    className="
                      h-8 rounded-md
                      border border-[var(--tech-border)]
                      !bg-transparent
                      px-3
                      text-[12px]
                      text-[var(--tech-text-secondary)]
                      hover:!border-orange-500/50
                      hover:!bg-transparent
                      hover:!text-orange-500
                    "
                  >
                    Cancel
                  </Button>

                  <Button
                    type="button"
                    onClick={
                      confirmDelete
                    }
                    className="
                      h-8 rounded-md
                      bg-orange-500
                      px-4
                      text-[12px]
                      font-medium
                      text-black
                      hover:bg-orange-600
                    "
                  >
                    OK
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
