import {

  type ReactNode,

  useEffect,

  useMemo,

  useState,

} from "react";



import {

  BatteryCharging,

  BatteryFull,

  ChevronLeft,

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




// Client-side pagination. The backend already returns batteries for the managed hub.
const BATTERIES_PER_PAGE = 9;

type PageItem = number | "left-ellipsis" | "right-ellipsis";

function getPageItems(currentPage: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const keep = new Set<number>([
    1, 2, totalPages - 1, totalPages,
    currentPage - 1, currentPage, currentPage + 1,
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

  const [page, setPage] = useState(1);



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



  // Filter first, paginate second. Keep the page in range after API changes.
  const totalPages = Math.max(1, Math.ceil(visibleBatteries.length / BATTERIES_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const firstIndex = (currentPage - 1) * BATTERIES_PER_PAGE;
  const pagedBatteries = visibleBatteries.slice(firstIndex, firstIndex + BATTERIES_PER_PAGE);
  const pageItems = getPageItems(currentPage, totalPages);
  const rangeStart = visibleBatteries.length === 0 ? 0 : firstIndex + 1;
  const rangeEnd = Math.min(firstIndex + BATTERIES_PER_PAGE, visibleBatteries.length);

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

            onChange={(value) => {
              setStatusFilter(value as BatteryFilter);
              setPage(1);
            }}

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

          <div className="min-w-[1180px]">

            <div className="grid grid-cols-[52px_145px_170px_130px_120px_110px_175px_minmax(110px,1fr)] gap-4 border-b border-[var(--tech-border)] px-5 py-3">

              <Header>STT</Header>

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

            pagedBatteries.map(

              (battery, index) => {

                return (

                  <div

                    key={battery.id}

                    className="grid grid-cols-[52px_145px_170px_130px_120px_110px_175px_minmax(110px,1fr)] items-center gap-4 px-5 py-4 transition-colors hover:bg-[var(--tech-surface-2)]/50"

                  >

                    <span className="text-[13px] tabular-nums text-[var(--tech-muted)]">
                      {firstIndex + index + 1}
                    </span>

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

        {/* Same 9-row pagination behavior as Hub Fleet. */}
        {!batteriesQuery.isPending && !batteriesQuery.isError && visibleBatteries.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--tech-border)] px-4 py-3 sm:px-5">
            <p className="text-[12px] tabular-nums text-[var(--tech-muted)]">
              Showing {rangeStart}–{rangeEnd} of {visibleBatteries.length} batteries
            </p>
            {totalPages > 1 && (
              <nav className="flex flex-wrap items-center gap-1.5" aria-label="Battery management pagination">
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
