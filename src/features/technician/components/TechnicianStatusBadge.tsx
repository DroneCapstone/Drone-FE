import { Badge } from "@/components/shadcn/ui/badge";

type Status =
  | "available"
  | "in-flight"
  | "maintenance"
  | "warning"
  | "critical"
  | "completed"
  | "open";

interface Props {
  status: Status;
}

const styles: Record<
  Status,
  string
> = {
  available:
    "border-emerald-500/20 bg-emerald-500/5 text-emerald-500",

  "in-flight":
    "border-sky-500/20 bg-sky-500/5 text-sky-400",

  maintenance:
    "border-orange-500/20 bg-orange-500/5 text-orange-400",

  warning:
    "border-amber-500/20 bg-amber-500/5 text-amber-400",

  critical:
    "border-red-500/20 bg-red-500/5 text-red-400",

  completed:
    "border-zinc-700 bg-zinc-800/50 text-zinc-400",

  open:
    "border-orange-500/20 bg-orange-500/5 text-orange-400",
};

export function TechnicianStatusBadge({
  status,
}: Props) {
  return (
    <Badge
      variant="outline"
      className={`
        rounded-md
        px-2 py-0.5
        text-[10px]
        font-medium
        capitalize
        ${styles[status]}
      `}
    >
      {status.replace("-", " ")}
    </Badge>
  );
}