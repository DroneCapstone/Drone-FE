import {

  type ReactNode,

  useEffect,

  useMemo,

  useState,

} from "react";



import {

  BatteryCharging,

  BatteryFull,

  ChevronRight,

  History,

  X,

} from "lucide-react";



import {

  useNavigate,

} from "react-router-dom";



import {

  Card,

  CardContent,

} from "@/components/shadcn/ui/card";



import {

  DropdownSelect,

} from "@/components/ui/DropdownSelect";



import {

  TechnicianPageShell,

} from "../components/TechnicianPageShell";



import {

  type BatteryHistoryRecord,

  type BatteryStatus,

  type HubBattery,

} from "../utils/batteryStorage";



import {

  useBatteriesQuery,

  useBatteryHistoryQuery,

} from "../hooks/useBatteryQueries";



type BatteryFilter =

  | "All status"

  | BatteryStatus;

/** ETA countdown is purely visual. Only Backend can mark a battery Ready. */
function formatCountdown(battery: HubBattery, now: number): string {
  if (battery.status !== "Charging") return "—";
  if (!battery.estimatedReadyAt) return "ETA unavailable";
  const finishAt = Date.parse(battery.estimatedReadyAt);
  if (!Number.isFinite(finishAt)) return "ETA unavailable";
  const secondsLeft = Math.max(0, Math.ceil((finishAt - now) / 1000));
  if (secondsLeft === 0) return "Awaiting BE update";
  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;
  const mmss = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return hours > 0 ? `${hours}:${mmss}` : mmss;
}




export function BatteryManagementPage() {

  const navigate =

    useNavigate();

  // Update visible countdown each second without sending a request per tick.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);



  const batteriesQuery =

    useBatteriesQuery();



  const historyQuery =

    useBatteryHistoryQuery();



  const batteries: HubBattery[] =

    batteriesQuery.data ?? [];



  const history: BatteryHistoryRecord[] =

    historyQuery.data ?? [];



  const [statusFilter, setStatusFilter] =

    useState<BatteryFilter>(

      "All status",

    );



  const [historyOpen, setHistoryOpen] =

    useState(false);



  /*

   * GET /technician/fleet/batteries is already scoped by the

   * authenticated Technician / managed hub. Do not filter the

   * response again using a hard-coded Hub HCM-02 string; doing so

   * can turn a valid 200 response into an empty UI.

   */

  const hubBatteries = batteries;



  const hubLabel =

    hubBatteries[0]?.hub ||

    "your managed hub";



  const visibleBatteries = useMemo(

    () =>

      hubBatteries.filter(

        (battery) =>

          statusFilter ===

            "All status" ||

          battery.status ===

            statusFilter,

      ),

    [hubBatteries, statusFilter],

  );



  const readyCount =

    hubBatteries.filter(

      (battery) =>

        battery.status === "Ready",

    ).length;



  const chargingCount =

    hubBatteries.filter(

      (battery) =>

        battery.status === "Charging",

    ).length;



  return (

    <TechnicianPageShell

      title="Battery management"

      description={`Shared battery inventory at ${hubLabel}. Charge level and charging status are loaded from the backend.`}

    >

      {batteriesQuery.error instanceof Error && (

        <div className="mb-4 rounded-md border border-red-500/25 px-4 py-3 text-[13px] text-red-500">

          {batteriesQuery.error.message}

        </div>

      )}



      <div className="mb-5 grid gap-4 md:grid-cols-3">

        <StatCard

          label="Ready"

          value={readyCount}

          helper="100% · Waiting for use"

        />



        <StatCard

          label="Charging"

          value={chargingCount}

          helper="Automatically becomes Ready when charging completes"

        />



        <StatCard

          label="Total at hub"

          value={hubBatteries.length}

          helper="Physical batteries in inventory"

        />

      </div>



      <Card className="overflow-hidden rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-none">

        <CardContent className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--tech-border)] p-4">

          <DropdownSelect

            value={statusFilter}

            onChange={(value) =>

              setStatusFilter(

                value as BatteryFilter,

              )

            }

            options={[

              "All status",

              "Ready",

              "Charging",

            ]}

            ariaLabel="Battery status"

            className="min-w-[190px]"

          />



          <button

            type="button"

            onClick={() =>

              setHistoryOpen(true)

            }

            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-md border border-[var(--tech-border)] px-4 text-[13px] font-medium text-[var(--tech-text-secondary)] transition-colors hover:border-orange-500/50 hover:text-orange-500"

          >

            <History size={15} />

            View history

          </button>

        </CardContent>



        <div className="overflow-x-auto">

          <div className="min-w-[1100px]">

            <div className="grid grid-cols-[145px_170px_130px_120px_110px_175px_1fr] gap-4 border-b border-[var(--tech-border)] px-5 py-3">

              <Header>Battery ID</Header>

              <Header>Model</Header>

              <Header>Capacity</Header>

              <Header>Charge</Header>

              <Header>Status</Header>

              <Header>Est. time left</Header>

              <Header alignRight>Details</Header>

            </div>



            <div className="divide-y divide-[var(--tech-border)]">

          {batteriesQuery.isPending &&

          hubBatteries.length === 0 ? (

            <div className="px-5 py-14 text-center text-[14px] text-[var(--tech-muted)]">

              Loading batteries...

            </div>

          ) : (

            visibleBatteries.map(

              (battery) => {

                return (

                  <div

                    key={battery.id}

                    className="grid grid-cols-[145px_170px_130px_120px_110px_175px_1fr] items-center gap-4 px-5 py-4 transition-colors hover:bg-[var(--tech-surface-2)]/50"

                  >

                    <span className="text-[14px] font-semibold text-[var(--tech-text)]">

                      {battery.id}

                    </span>



                    <span className="truncate text-[13px] font-medium text-[var(--tech-text-secondary)]">

                      {battery.model ?? "—"}

                    </span>



                    <span className="text-[13px] text-[var(--tech-text-secondary)]">

                      {battery.capacityWh

                        ? `${battery.capacityWh} Wh`

                        : "—"}

                    </span>



                    <div className="flex items-center gap-2">

                      {battery.status ===

                      "Ready" ? (

                        <BatteryFull

                          size={16}

                          className="text-orange-500"

                        />

                      ) : (

                        <BatteryCharging

                          size={16}

                          className="text-[var(--tech-muted)]"

                        />

                      )}



                      <span className="text-[14px] font-medium text-[var(--tech-text-secondary)]">

                        {battery.chargeLevelPct}%

                      </span>

                    </div>



                    <span

                      className={

                        battery.status ===

                        "Ready"

                          ? "text-[13px] font-medium text-orange-500"

                          : "text-[13px] text-[var(--tech-text-secondary)]"

                      }

                    >

                      {battery.status}

                    </span>

                    <span
                      className={`text-[12px] ${battery.status === "Charging" ? "font-semibold tabular-nums text-orange-500" : "text-[var(--tech-muted)]"}`}
                      title={battery.status === "Charging" ? "Estimated time remaining, from Backend" : undefined}
                    >
                      {formatCountdown(battery, now)}
                    </span>





                    <div className="flex justify-end">

                      <button

                        type="button"

                        onClick={() =>

                          navigate(

                            `/technician/fleet/batteries/${encodeURIComponent(

                              battery.backendId ??

                                battery.id,

                            )}`,

                          )

                        }

                        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[var(--tech-border)] px-3 text-[12px] font-medium text-[var(--tech-text-secondary)] transition-colors hover:border-orange-500/50 hover:text-orange-500"

                      >

                        View details

                        <ChevronRight size={14} />

                      </button>

                    </div>

                  </div>

                );

              },

            )

          )}



          {!batteriesQuery.isPending &&

            hubBatteries.length === 0 && (

              <div className="px-5 py-14 text-center">

                <p className="text-[14px] font-medium text-[var(--tech-text-secondary)]">

                  No batteries are assigned to this technician hub.

                </p>

                <p className="mx-auto mt-2 max-w-[680px] text-[12px] leading-5 text-[var(--tech-muted)]">

                  The request succeeded, but Backend returned an empty battery list.

                  Check the authenticated Technician&apos;s hub assignment and make sure

                  each battery&apos;s current_hub_id points to that same hub.

                </p>

              </div>

            )}



          {!batteriesQuery.isPending &&

            hubBatteries.length > 0 &&

            visibleBatteries.length === 0 && (

              <div className="px-5 py-14 text-center">

                <p className="text-[14px] text-[var(--tech-muted)]">

                  No batteries match this status.

                </p>

              </div>

            )}

            </div>

          </div>

        </div>

      </Card>



      {historyOpen && (

        <div

          className="fixed inset-0 z-[140] flex items-center justify-center bg-black/60 px-4 py-6"

          onMouseDown={(event) => {

            if (

              event.target ===

              event.currentTarget

            ) {

              setHistoryOpen(false);

            }

          }}

        >

          <div className="flex max-h-[82vh] w-full max-w-[1120px] flex-col overflow-hidden rounded-xl border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-2xl">

            <div className="flex items-start justify-between gap-4 border-b border-[var(--tech-border)] px-6 py-5">

              <div>

                <h2 className="text-[20px] font-semibold text-[var(--tech-text)]">

                  Battery history

                </h2>



                <p className="mt-1 text-[13px] text-[var(--tech-muted)]">

                  Local session history for battery removal, charging completion and mission use. Backend does not currently expose a battery-history endpoint.

                </p>

              </div>



              <button

                type="button"

                onClick={() =>

                  setHistoryOpen(false)

                }

                className="rounded-md p-1.5 text-[var(--tech-muted)] transition-colors hover:text-orange-500"

              >

                <X size={19} />

              </button>

            </div>



            <div className="min-h-0 flex-1 overflow-auto">

              <div className="min-w-[1040px]">

                <div className="sticky top-0 z-10 grid grid-cols-[130px_170px_120px_130px_130px_190px_1fr] gap-4 border-b border-[var(--tech-border)] bg-[var(--tech-surface)] px-6 py-3">

                  <Header>Battery</Header>

                  <Header>Action</Header>

                  <Header>Charge</Header>

                  <Header>Mission</Header>

                  <Header>Drone</Header>

                  <Header>Time</Header>

                  <Header>Note</Header>

                </div>



                {history.length > 0 ? (

                  history.map(

                    (record) => (

                      <div

                        key={record.id}

                        className="grid grid-cols-[130px_170px_120px_130px_130px_190px_1fr] gap-4 border-b border-[var(--tech-border)] px-6 py-4 text-[12px] text-[var(--tech-text-secondary)]"

                      >

                        <span className="font-semibold text-[var(--tech-text)]">

                          {record.batteryId}

                        </span>

                        <span>{record.action}</span>

                        <span>{record.chargeLevelPct}%</span>

                        <span>{record.missionId ?? "—"}</span>

                        <span>{record.droneId ?? "—"}</span>

                        <span>{record.occurredAt}</span>

                        <span className="text-[var(--tech-muted)]">

                          {record.note ?? "—"}

                        </span>

                      </div>

                    ),

                  )

                ) : (

                  <div className="px-6 py-12 text-center text-[13px] text-[var(--tech-muted)]">

                    No local battery history yet.

                  </div>

                )}

              </div>

            </div>

          </div>

        </div>

      )}

    </TechnicianPageShell>

  );

}



function StatCard({

  label,

  value,

  helper,

}: {

  label: string;

  value: number;

  helper: string;

}) {

  return (

    <Card className="rounded-lg border border-[var(--tech-border)] bg-[var(--tech-surface)] shadow-none">

      <CardContent className="p-6">

        <p className="text-[13px] font-medium text-[var(--tech-text-secondary)]">

          {label}

        </p>

        <p className="mt-4 text-[32px] font-semibold text-[var(--tech-text)]">

          {value}

        </p>

        <p className="mt-2 text-[12px] text-[var(--tech-muted)]">

          {helper}

        </p>

      </CardContent>

    </Card>

  );

}



function Header({

  children,

  alignRight = false,

}: {

  children: ReactNode;

  alignRight?: boolean;

}) {

  return (

    <span

      className={`text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--tech-muted)] ${

        alignRight ? "text-right" : ""

      }`}

    >

      {children}

    </span>

  );

}
