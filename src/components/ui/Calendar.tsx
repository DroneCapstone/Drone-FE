import {
    ChevronDown,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import {
    DayPicker,
    type DayPickerProps,
    type DropdownProps,
} from "react-day-picker";
import type { ChangeEvent } from "react";

import { cn } from "@/lib/utils";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "./Select";

export type CalendarProps = DayPickerProps;

function CalendarDropdown({
    options,
    value,
    onChange,
    disabled,
    "aria-label": ariaLabel,
}: DropdownProps) {
    const handleValueChange = (nextValue: string) => {
        onChange?.({
            target: { value: nextValue },
            currentTarget: { value: nextValue },
        } as ChangeEvent<HTMLSelectElement>);
    };

    return (
        <Select
            value={String(value)}
            onValueChange={handleValueChange}
            disabled={disabled}
        >
            <SelectTrigger
                aria-label={ariaLabel}
                className="h-9 w-fit min-w-0 justify-center gap-1 border-0 bg-transparent px-2 shadow-none hover:bg-muted"
            >
                <SelectValue />
            </SelectTrigger>

            <SelectContent
                className="max-h-50 w-max min-w-[var(--radix-select-trigger-width)]"
            >
                {options?.map((option) => (
                    <SelectItem
                        key={option.value}
                        value={String(option.value)}
                        disabled={option.disabled}
                        className="justify-center px-2 text-center"
                    >
                        {option.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

function Calendar({
    className,
    classNames,
    components,
    showOutsideDays = true,
    ...props
}: CalendarProps) {
    return (
        <DayPicker
            showOutsideDays={showOutsideDays}
            className={cn("relative w-full p-3", className)}
            classNames={{
                root: "w-full",

                months: "relative flex w-full flex-col",

                month: "w-full",

                month_caption:
                    "flex h-10 items-center justify-start",

                caption_label:
                    "pointer-events-none flex items-center gap-1 text-sm font-semibold text-foreground",

                dropdowns:
                    "flex items-center justify-start gap-1",

                dropdown_root:
                    "relative inline-flex h-9 items-center rounded-md px-2 transition-colors hover:bg-muted",

                dropdown:
                    "absolute inset-0 cursor-pointer opacity-0",

                nav:
                    "absolute right-0 top-0 flex h-10 items-center gap-1",

                button_previous:
                    "inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-orange-50 hover:text-orange-600 disabled:pointer-events-none disabled:opacity-40",

                button_next:
                    "inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-orange-50 hover:text-orange-600 disabled:pointer-events-none disabled:opacity-40",

                month_grid:
                    "!w-full !min-w-0 table-fixed border-collapse",

                weekdays: "border-0",

                weekday:
                    "!h-9 !w-[14.285%] !border-b-0 !p-0 !text-center text-xs font-medium !normal-case !tracking-normal text-muted-foreground",

                week: "!cursor-default border-0 hover:!bg-transparent",

                day:
                    "relative !h-10 !w-[14.285%] !border-b-0 !p-0 text-center text-sm",

                day_button:
                    "mx-auto inline-flex h-9 w-9 items-center justify-center rounded-full p-0 text-sm font-normal transition-colors hover:bg-orange-50 hover:text-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2",

                selected:
                    "[&>button]:bg-orange-500 [&>button]:text-white [&>button]:hover:bg-orange-600 [&>button]:hover:text-white",

                today:
                    "[&>button]:border [&>button]:border-orange-400 [&>button]:font-semibold [&>button]:text-orange-600",

                outside:
                    "text-muted-foreground opacity-35",

                disabled:
                    "text-muted-foreground opacity-30",

                hidden:
                    "invisible",

                range_start:
                    "[&>button]:bg-orange-500 [&>button]:text-white",

                range_middle:
                    "[&>button]:rounded-none [&>button]:bg-orange-50 [&>button]:text-orange-700",

                range_end:
                    "[&>button]:bg-orange-500 [&>button]:text-white",

                ...classNames,
            }}
            components={{
                Dropdown: CalendarDropdown,
                Chevron: ({ orientation, className: iconClassName }) => {
                    if (orientation === "left") {
                        return (
                            <ChevronLeft
                                className={cn("h-4 w-4", iconClassName)}
                            />
                        );
                    }

                    if (orientation === "right") {
                        return (
                            <ChevronRight
                                className={cn("h-4 w-4", iconClassName)}
                            />
                        );
                    }

                    return (
                        <ChevronDown
                            className={cn("h-4 w-4", iconClassName)}
                        />
                    );
                },
                ...components,
            }}
            {...props}
        />
    );
}

Calendar.displayName = "Calendar";

export { Calendar };
