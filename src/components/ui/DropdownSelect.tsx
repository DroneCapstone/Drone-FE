import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./Select";

interface DropdownSelectProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
}

export function DropdownSelect({
  value,
  options,
  onChange,
  ariaLabel,
  className,
}: DropdownSelectProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <div className={cn("dropdown-select", className)}>
        <SelectTrigger className="dropdown-trigger" aria-label={ariaLabel}>
          <SelectValue />
        </SelectTrigger>
      </div>
      <SelectContent
        className="dropdown-menu dropdown-menu-portal dropdown-menu-radix"
        sideOffset={7}
        align="start"
      >
        {options.map((option) => (
          <SelectItem
            className={cn("dropdown-menu-item", option === value && "selected")}
            value={option}
            key={option}
          >
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
