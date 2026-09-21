import {
  type LucideIcon,
} from "lucide-react";

import {
  Card,
  CardContent,
} from "@/components/shadcn/ui/card";

interface Props {
  label: string;
  value: string;
  description: string;
  icon: LucideIcon;
}

export function TechnicianStatCard({
  label,
  value,
  description,
  icon: Icon,
}: Props) {
  return (
    <Card className="rounded-lg border-zinc-800 bg-[#121419] shadow-none">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <span className="text-[11px] text-zinc-500">
            {label}
          </span>

          <Icon
            size={16}
            strokeWidth={1.5}
            className="text-zinc-600"
          />
        </div>

        <p className="mt-3 text-[25px] font-medium tracking-[-0.04em] text-zinc-100">
          {value}
        </p>

        <p className="mt-1 text-[10px] text-zinc-600">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}