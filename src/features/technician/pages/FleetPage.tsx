import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";

import { AnimatePresence, motion } from "framer-motion";

import {
  ArrowUpRight,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import { Button } from "@/components/shadcn/ui/button";

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

import { TechnicianPageShell } from "../components/TechnicianPageShell";

import {
  loadFleet,
  saveFleet,
  TECHNICIAN_HUB,
  type DroneStatus,
  type FleetDrone,
} from "../utils/fleetStorage";

type DroneForm = {
  id: string;
  name: string;
  model: string;
  status: DroneStatus;
  battery: string;
};

type BatteryFilter =
  | "all"
  | "normal"
  | "low";

type LocationFilter =
  | "all"
  | "at-hub"
  | "incoming";

const initialForm: DroneForm = {
  id: "",
  name: "",
  model: "",
  status: "Available",
  battery: "100",
};

export function FleetPage() {
  const navigate = useNavigate();

  const [drones, setDrones] =
    useState<FleetDrone[]>(loadFleet);

  const [searchQuery, setSearchQuery] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState<"all" | DroneStatus>("all");

  const [
    locationFilter,
    setLocationFilter,
  ] = useState<LocationFilter>("all");

  const [
    batteryFilter,
    setBatteryFilter,
  ] = useState<BatteryFilter>("all");

  const [modalOpen, setModalOpen] =
    useState(false);

  const [
    editingDroneId,
    setEditingDroneId,
  ] = useState<string | null>(null);

  const [form, setForm] =
    useState<DroneForm>(initialForm);

  const [formError, setFormError] =
    useState("");

  const [
    deleteConfirmTarget,
    setDeleteConfirmTarget,
  ] = useState<FleetDrone | null>(null);

  useEffect(() => {
    saveFleet(drones);
  }, [drones]);

  /* =========================
     HUB LOGIC
  ========================= */

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
    drone.location === TECHNICIAN_HUB;

  /*
   * Technician chỉ thấy:
   * - Drone hiện có tại Hub của mình
   * - Drone đang bay tới Hub của mình
   */
  const hubDrones = useMemo(
    () =>
      drones.filter(
        (drone) =>
          isAtMyHub(drone) ||
          isIncomingToMyHub(drone),
      ),
    [drones],
  );

  /* =========================
     SEARCH / FILTER
  ========================= */

  const filteredDrones = useMemo(() => {
    const query = searchQuery
      .trim()
      .toLowerCase();

    return hubDrones.filter((drone) => {
      const incoming =
        isIncomingToMyHub(drone);

      const matchesSearch =
        !query ||
        drone.name
          .toLowerCase()
          .includes(query) ||
        drone.id
          .toLowerCase()
          .includes(query) ||
        drone.model
          .toLowerCase()
          .includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        drone.status === statusFilter;

      const matchesLocation =
        locationFilter === "all" ||
        (locationFilter ===
          "at-hub" &&
          !incoming) ||
        (locationFilter ===
          "incoming" &&
          incoming);

      const matchesBattery =
        batteryFilter === "all" ||
        (batteryFilter === "low" &&
          drone.battery < 40) ||
        (batteryFilter ===
          "normal" &&
          drone.battery >= 40);

      return (
        matchesSearch &&
        matchesStatus &&
        matchesLocation &&
        matchesBattery
      );
    });
  }, [
    hubDrones,
    searchQuery,
    statusFilter,
    locationFilter,
    batteryFilter,
  ]);

  /* =========================
     REGISTER
  ========================= */

  const openRegisterModal = () => {
    setEditingDroneId(null);
    setForm(initialForm);
    setFormError("");
    setModalOpen(true);
  };

  /* =========================
     EDIT
  ========================= */

  const openEditModal = (
    drone: FleetDrone,
  ) => {
    setEditingDroneId(drone.id);

    setForm({
      id: drone.id,
      name: drone.name,
      model: drone.model,
      status: drone.status,
      battery: String(drone.battery),
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

  /* =========================
     SAVE
  ========================= */

  const handleSubmit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const battery = Number(
      form.battery,
    );

    if (
      !form.id.trim() ||
      !form.name.trim() ||
      !form.model.trim()
    ) {
      setFormError(
        "Please complete all required fields.",
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

    const duplicatedId = drones.some(
      (drone) =>
        drone.id.toLowerCase() ===
          form.id
            .trim()
            .toLowerCase() &&
        drone.id !== editingDroneId,
    );

    if (duplicatedId) {
      setFormError(
        "Drone ID already exists.",
      );

      return;
    }

    if (editingDroneId) {
      setDrones((current) =>
        current.map((drone) =>
          drone.id === editingDroneId
            ? {
                ...drone,

                id: form.id.trim(),

                name:
                  form.name.trim(),

                model:
                  form.model.trim(),

                status:
                  form.status,

                battery,
              }
            : drone,
        ),
      );
    } else {
      /*
       * Register chỉ dùng cho drone mới
       * được đưa trực tiếp vào Hub HCM-02.
       */
      const newDrone: FleetDrone = {
        id: form.id.trim(),

        name: form.name.trim(),

        model: form.model.trim(),

        status: form.status,

        battery,

        utilization: 0,

        lastFlight: "Not flown",

        location:
          TECHNICIAN_HUB,
      };

      setDrones((current) => [
        ...current,
        newDrone,
      ]);
    }

    closeModal();
  };

  /* =========================
     STATUS
  ========================= */

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

  /* =========================
     DELETE
  ========================= */

  const handleDelete = (
    drone: FleetDrone,
  ) => {
    setDeleteConfirmTarget(drone);
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

    setDeleteConfirmTarget(null);
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
      action={
        <Button
          type="button"
          onClick={
            openRegisterModal
          }
          className="h-9 rounded-md bg-orange-500 px-4 font-sans text-[13px] font-medium text-black hover:bg-orange-600"
        >
          <Plus size={15} />

          Register drone
        </Button>
      }
    >
      <Card className="overflow-hidden rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-none">
        {/* Search + filters */}
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
                  event.target.value,
                )
              }
              placeholder="Search drone ID, name or model..."
              className="tech-control h-9 w-full pl-9 pr-3 !text-[13px]"
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target
                  .value as
                  | "all"
                  | DroneStatus,
              )
            }
            className="tech-control h-9 min-w-[150px] px-3 !text-[13px]"
          >
            <option value="all">
              All status
            </option>

            <option value="Available">
              Available
            </option>

            <option value="Maintenance">
              Maintenance
            </option>

            <option value="Battery Replacement">
              Battery replacement
            </option>
          </select>

          {/* Location filter */}
          <select
            value={locationFilter}
            onChange={(event) =>
              setLocationFilter(
                event.target
                  .value as LocationFilter,
              )
            }
            className="tech-control h-9 min-w-[150px] px-3 !text-[13px]"
          >
            <option value="all">
              All location
            </option>

            <option value="at-hub">
              At my hub
            </option>

            <option value="incoming">
              Incoming
            </option>
          </select>

          {/* Battery filter */}
          <select
            value={batteryFilter}
            onChange={(event) =>
              setBatteryFilter(
                event.target
                  .value as BatteryFilter,
              )
            }
            className="tech-control h-9 min-w-[145px] px-3 !text-[13px]"
          >
            <option value="all">
              All battery
            </option>

            <option value="normal">
              Normal ≥ 40%
            </option>

            <option value="low">
              Low &lt; 40%
            </option>
          </select>
        </div>

        <CardContent className="p-0">
          <Table className="fleet-table table-fixed">
            <colgroup>
              <col className="w-[14%]" />
              <col className="w-[15%]" />
              <col className="w-[16%]" />
              <col className="w-[15%]" />
              <col className="w-[18%]" />
              <col className="w-[11%]" />
              <col className="w-[11%]" />
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
                  Utilization
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

                    return (
                      <TableRow
                        key={
                          drone.id
                        }
                        className="fleet-data-row hover:bg-[var(--tech-surface-2)]"
                      >
                        {/* Drone */}
                        <TableCell className="h-[72px] text-center">
                          <strong className="block text-[14px] font-medium text-[var(--tech-text)]">
                            {
                              drone.name
                            }
                          </strong>

                          <p className="mt-0.5 text-[11px] text-[var(--tech-subtle)]">
                            {
                              drone.id
                            }
                          </p>
                        </TableCell>

                        {/* Model */}
                        <TableCell className="text-center text-[13px] text-[var(--tech-muted)]">
                          {
                            drone.model
                          }
                        </TableCell>

                        {/* Status */}
                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            <select
                              value={
                                drone.status
                              }
                              onChange={(
                                event,
                              ) =>
                                handleStatusChange(
                                  drone.id,
                                  event
                                    .target
                                    .value as DroneStatus,
                                )
                              }
                              className="h-8 w-[145px] rounded-md border border-[var(--tech-border)] bg-[var(--tech-surface-2)] px-2.5 text-[12px] font-medium outline-none focus:border-orange-500"
                            >
                              <option value="Available">
                                Available
                              </option>

                              <option value="Maintenance">
                                Maintenance
                              </option>

                              <option value="Battery Replacement">
                                Battery
                                replacement
                              </option>
                            </select>
                          </div>
                        </TableCell>

                        {/* Battery */}
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

                        {/* Location */}
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

                        {/* Utilization */}
                        <TableCell className="text-center text-[13px] text-[var(--tech-muted)]">
                          {
                            drone.utilization
                          }
                          %
                        </TableCell>

                        {/* Actions */}
                        <TableCell>
                          <div className="flex justify-center gap-2">
                            {/* Drone đã ở Hub */}
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

                            {/* Cả incoming và at hub đều xem detail */}
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
                    colSpan={7}
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

      {/* =========================
          REGISTER / EDIT MODAL
      ========================= */}

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4">
          <div className="w-full max-w-[520px] overflow-hidden rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-2xl">
            <div className="flex justify-between border-b border-[var(--tech-border)] px-6 py-5">
              <div>
                <h2 className="text-[18px] font-semibold text-[var(--tech-text)]">
                  {editingDroneId
                    ? "Edit drone"
                    : "Register drone"}
                </h2>

                <p className="mt-1 text-[13px] text-[var(--tech-muted)]">
                  {editingDroneId
                    ? "Update drone information."
                    : `Register a new drone at ${TECHNICIAN_HUB}.`}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
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
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Drone ID">
                    <input
                      required
                      value={form.id}
                      onChange={(
                        event,
                      ) =>
                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,
                            id: event
                              .target
                              .value,
                          }),
                        )
                      }
                      className="tech-control h-10 w-full px-3 !text-[13px]"
                      placeholder="DR-005"
                    />
                  </Field>

                  <Field label="Drone name">
                    <input
                      required
                      value={
                        form.name
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,
                            name: event
                              .target
                              .value,
                          }),
                        )
                      }
                      className="tech-control h-10 w-full px-3 !text-[13px]"
                      placeholder="CX-15"
                    />
                  </Field>
                </div>

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
                    <select
                      value={
                        form.status
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm(
                          (
                            current,
                          ) => ({
                            ...current,
                            status:
                              event
                                .target
                                .value as DroneStatus,
                          }),
                        )
                      }
                      className="tech-control h-10 w-full px-3 !text-[13px]"
                    >
                      <option value="Available">
                        Available
                      </option>

                      <option value="Maintenance">
                        Maintenance
                      </option>

                      <option value="Battery Replacement">
                        Battery
                        replacement
                      </option>
                    </select>
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
                    className="tech-control h-10 w-full px-3 !text-[13px]"
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
                  className="h-9 rounded-md border border-[var(--tech-border)] bg-transparent px-4 text-[13px] text-[var(--tech-text-secondary)] hover:bg-[var(--tech-surface-2)]"
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  className="h-9 rounded-md bg-orange-500 px-4 text-[13px] font-medium text-black hover:bg-orange-600"
                >
                  {editingDroneId
                    ? "Save changes"
                    : "Register drone"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================
          DELETE CONFIRMATION
      ========================= */}

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
            {/* Animated orange gradient border */}
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
                  ease: "easeInOut",
                  repeat: Infinity,
                  repeatType: "loop",
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
                <Trash2 size={15} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-[var(--tech-text)]">
                  Confirm drone deletion
                </p>

                <p className="mt-1 text-[12px] leading-4 text-[var(--tech-muted)]">
                  Delete{" "}
                  {deleteConfirmTarget.name} (
                  {deleteConfirmTarget.id})
                  from the fleet?
                </p>

                <p className="mt-1 text-[11px] text-[var(--tech-subtle)]">
                  This action removes the drone
                  from your current fleet list.
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
                      bg-transparent
                      px-3
                      text-[12px]
                      text-[var(--tech-text-secondary)]
                      hover:bg-[var(--tech-surface-2)]
                    "
                  >
                    Cancel
                  </Button>

                  <Button
                    type="button"
                    onClick={confirmDelete}
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