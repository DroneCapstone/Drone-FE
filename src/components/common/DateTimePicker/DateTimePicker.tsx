import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon, Clock3 } from "lucide-react"

import { Button } from "../../ui/Button"
import { Calendar } from "../../ui/Calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "../../ui/Popover"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../ui/Select"
import { cn } from "@/lib/utils"

type DepartureDateTimePickerProps = {
    value?: Date
    onChange?: (value: Date | undefined) => void
    placeholder?: string
    startMonth?: Date
    endMonth?: Date
}

const hours = Array.from({ length: 24 }, (_, i) =>
    String(i).padStart(2, "0")
)

const minutes = Array.from({ length: 60 }, (_, i) =>
    String(i).padStart(2, "0")
)

function getTimeValue(date: Date) {
    return {
        hour: String(date.getHours()).padStart(2, "0"),
        minute: String(date.getMinutes()).padStart(2, "0"),
    }
}

function buildDate(base: Date, hour: string, minute: string) {
    const next = new Date(base)
    next.setHours(Number(hour))
    next.setMinutes(Number(minute))
    next.setSeconds(0)
    next.setMilliseconds(0)

    return next
}

export function DepartureDateTimePicker({
    value,
    onChange,
    placeholder = "Select departure date & time",
    startMonth = new Date(2020, 0),
    endMonth = new Date(2035, 11),
}: DepartureDateTimePickerProps) {
    const [open, setOpen] = React.useState(false)
    const [draft, setDraft] = React.useState<Date>(value ?? new Date())
    const [month, setMonth] = React.useState<Date>(value ?? new Date())

    const timeValue = getTimeValue(draft)

    const handleDateSelect = (date: Date | undefined) => {
        if (!date) return
        const merged = new Date(date)
        merged.setHours(draft.getHours())
        merged.setMinutes(draft.getMinutes())
        merged.setSeconds(0)
        merged.setMilliseconds(0)
        setDraft(merged)
        setMonth(date)
    }

    const handleTimeChange = (
        type: "hour" | "minute",
        nextValue: string
    ) => {
        const current = getTimeValue(draft)

        const nextHour = type === "hour" ? nextValue : current.hour
        const nextMinute = type === "minute" ? nextValue : current.minute

        setDraft(buildDate(draft, nextHour, nextMinute))
    }

    const handleSave = () => {
        onChange?.(draft)
        setOpen(false)
    }

    const handleCancel = () => {
        setDraft(value ?? new Date())
        setMonth(value ?? new Date())
        setOpen(false)
    }

    const handleOpenChange = (nextOpen: boolean) => {
        if (nextOpen) {
            const nextDraft = value ?? new Date()
            setDraft(nextDraft)
            setMonth(nextDraft)
        }

        setOpen(nextOpen)
    }

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="secondary"
                    className={cn(
                        "w-full justify-start text-left font-normal",
                        !value && "text-muted-foreground"
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4 text-orange-500" />
                    {value ? format(value, "PPP p") : placeholder}
                </Button>
            </PopoverTrigger>

            <PopoverContent
                className="
        max-h-[var(--radix-popover-content-available-height)]
        w-[min(22rem,calc(100vw-2rem))]
        overflow-x-hidden
        overflow-y-auto
        overscroll-contain
        rounded-xl
        p-0

        [scrollbar-width:none]
        [&::-webkit-scrollbar]:hidden
    "
                align="start"
                sideOffset={8}
                collisionPadding={16}
            >
                {/* DATE */}
                <div>
                    <div className="flex h-14 items-center gap-3 bg-secondary px-5">
                        <CalendarIcon className="h-5 w-5 text-orange-500" />
                        <span className="text-base font-semibold">Date</span>
                    </div>

                    <div className="px-5 py-3">
                        <Calendar
                            mode="single"
                            selected={draft}
                            onSelect={handleDateSelect}
                            month={month}
                            onMonthChange={setMonth}
                            captionLayout="dropdown"
                            navLayout="after"
                            startMonth={startMonth}
                            endMonth={endMonth}
                            showOutsideDays
                            className="p-0"
                        />
                    </div>
                </div>

                {/* TIME */}
                <div>
                    <div className="flex h-14 items-center gap-3 bg-secondary px-5">
                        <Clock3 className="h-5 w-5 text-orange-500" />
                        <span className="text-base font-semibold">Time</span>
                    </div>

                    <div className="flex items-center gap-2 px-5 py-4">
                        <Select
                            value={timeValue.hour}
                            onValueChange={(v) => handleTimeChange("hour", v)}
                        >
                            <SelectTrigger
                                className="h-9 w-fit min-w-0 gap-1 px-2"
                                aria-label="Hour"
                            >
                                <SelectValue />
                            </SelectTrigger>

                            <SelectContent className="max-h-48 w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)]">
                                {hours.map((hour) => (
                                    <SelectItem
                                        key={hour}
                                        value={hour}
                                        className="justify-center !px-2 text-center [&>span:last-child]:w-full [&>span:last-child]:text-center"
                                    >
                                        {hour}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <span className="text-lg font-medium text-muted-foreground">:</span>

                        <Select
                            value={timeValue.minute}
                            onValueChange={(v) => handleTimeChange("minute", v)}
                        >
                            <SelectTrigger
                                className="h-9 w-fit min-w-0 gap-1 px-2"
                                aria-label="Minute"
                            >
                                <SelectValue />
                            </SelectTrigger>

                            <SelectContent className="max-h-48 w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)]">
                                {minutes.map((minute) => (
                                    <SelectItem
                                        key={minute}
                                        value={minute}
                                        className="justify-center !px-2 text-center [&>span:last-child]:w-full [&>span:last-child]:text-center"
                                    >
                                        {minute}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                    </div>
                </div>

                {/* ACTIONS */}
                <div className="flex justify-end gap-3 bg-secondary/60 px-5 py-4">
                    <Button type="button" variant="secondary" onClick={handleCancel}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSave}
                        className="bg-orange-500 text-white hover:bg-orange-600"
                    >
                        Apply
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    )
}
