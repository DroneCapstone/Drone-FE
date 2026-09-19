import {
  Download,
  FileText,
} from "lucide-react";

import {
  Button,
} from "@/components/shadcn/ui/button";

import {
  Card,
  CardContent,
} from "@/components/shadcn/ui/card";

import {
  TechnicianPageShell,
} from "../components/TechnicianPageShell";

const reports = [
  {
    id: "MR-090",
    title: "Fleet maintenance summary",
    period: "September 2026",
  },
  {
    id: "MR-089",
    title: "Battery replacement history",
    period: "August 2026",
  },
  {
    id: "MR-088",
    title: "Drone incident investigation report",
    period: "August 2026",
  },
];

export function TechnicianReportsPage() {
  return (
    <TechnicianPageShell
      title="Reports"
      description="Maintenance and technical fleet records."
    >
      <div className="space-y-2">
        {reports.map((report) => (
          <Card
            key={report.id}
            className="rounded-lg border-zinc-800 bg-[#121419] shadow-none"
          >
            <CardContent className="flex items-center gap-4 p-4">
              <FileText
                size={17}
                className="text-zinc-500"
              />

              <div className="flex-1">
                <p className="text-[11px] text-zinc-200">
                  {report.title}
                </p>

                <span className="text-[9px] text-zinc-600">
                  {report.id} ·{" "}
                  {report.period}
                </span>
              </div>

              <Button
                variant="ghost"
                size="icon"
              >
                <Download size={15} />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </TechnicianPageShell>
  );
}