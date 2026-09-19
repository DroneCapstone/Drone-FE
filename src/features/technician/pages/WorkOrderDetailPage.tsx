import {
  Check,
  ClipboardCheck,
  Package,
  Stethoscope,
  Wrench,
} from "lucide-react";

import {
  Button,
} from "@/components/shadcn/ui/button";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shadcn/ui/card";

import {
  Textarea,
} from "@/components/shadcn/ui/textarea";

import {
  TechnicianPageShell,
} from "../components/TechnicianPageShell";

export function WorkOrderDetailPage() {
  return (
    <TechnicianPageShell
      title="WO-1054"
      description="AX-04 · Battery replacement"
      action={
        <Button className="h-9 bg-orange-500 text-[11px] text-black hover:bg-orange-600">
          Complete work order
        </Button>
      }
    >
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <Section
            icon={ClipboardCheck}
            title="Inspection"
          >
            <InspectionItem
              label="Battery enclosure"
              checked
            />

            <InspectionItem
              label="Battery connector"
              checked
            />

            <InspectionItem
              label="Battery level verification"
              checked
            />

            <InspectionItem
              label="Power system test"
            />
          </Section>

          <Section
            icon={Stethoscope}
            title="Diagnosis"
          >
            <Textarea
              className="min-h-28 border-zinc-800 bg-[#0f1115] text-[11px]"
              defaultValue="Battery charge level is below operational threshold. No connector or enclosure defects detected."
            />
          </Section>

          <Section
            icon={Wrench}
            title="Corrective action"
          >
            <Textarea
              className="min-h-28 border-zinc-800 bg-[#0f1115] text-[11px]"
              placeholder="Record corrective action..."
            />
          </Section>
        </div>

        <div className="space-y-5">
          <Card className="rounded-lg border-zinc-800 bg-[#121419] shadow-none">
            <CardHeader>
              <CardTitle className="text-[13px] font-medium">
                Work order information
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <Meta
                label="Drone"
                value="AX-04"
              />

              <Meta
                label="Priority"
                value="High"
              />

              <Meta
                label="Assigned technician"
                value="Technician Demo"
              />

              <Meta
                label="Created"
                value="18 Sep · 08:21"
              />
            </CardContent>
          </Card>

          <Card className="rounded-lg border-zinc-800 bg-[#121419] shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-[13px] font-medium">
                <Package size={15} />

                Spare parts
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="rounded-md border border-zinc-800 p-3">
                <span className="text-[11px] text-zinc-300">
                  TB65 Battery
                </span>

                <p className="mt-1 text-[9px] text-zinc-600">
                  BAT-114 · Qty 1
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </TechnicianPageShell>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: any) {
  return (
    <Card className="rounded-lg border-zinc-800 bg-[#121419] shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[13px] font-medium">
          <Icon
            size={15}
            className="text-orange-500"
          />

          {title}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-2">
        {children}
      </CardContent>
    </Card>
  );
}

function InspectionItem({
  label,
  checked = false,
}: {
  label: string;
  checked?: boolean;
}) {
  return (
    <div className="flex h-10 items-center justify-between rounded-md border border-zinc-800 px-3">
      <span className="text-[11px] text-zinc-400">
        {label}
      </span>

      <span
        className={`
          grid h-5 w-5
          place-items-center
          rounded border
          ${
            checked
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
              : "border-zinc-700 text-zinc-700"
          }
        `}
      >
        {checked && (
          <Check size={12} />
        )}
      </span>
    </div>
  );
}

function Meta({
  label,
  value,
}: any) {
  return (
    <div>
      <span className="text-[9px] uppercase tracking-[0.08em] text-zinc-600">
        {label}
      </span>

      <p className="mt-1 text-[11px] text-zinc-300">
        {value}
      </p>
    </div>
  );
}