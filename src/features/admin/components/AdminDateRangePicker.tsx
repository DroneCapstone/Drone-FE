import { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { type DateRange } from 'react-day-picker';
import { Calendar } from '../../../components/ui/Calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/ui/Popover';
import './AdminDateRangePicker.css';

interface AdminDateRangePickerProps {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  label: string;
  max?: string;
}

// Parse calendar days in local time, not UTC. API filters remain YYYY-MM-DD.
export function parseCalendarDate(value: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : undefined;
}

export function calendarDateKey(value: Date): string {
  return `${String(value.getFullYear()).padStart(4, '0')}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

const formatDate = (value: Date) => value.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

function getRange(from: string, to: string): DateRange | undefined {
  const start = parseCalendarDate(from);
  const end = parseCalendarDate(to);
  if (!start && !end) return undefined;
  return { from: start, to: end };
}

function rangeLabel(range: DateRange | undefined) {
  if (!range?.from && !range?.to) return 'Select date range';
  if (!range.from) return `Until ${formatDate(range.to!)}`;
  if (!range.to) return `From ${formatDate(range.from)}`;
  return `${formatDate(range.from)} – ${formatDate(range.to)}`;
}

export function AdminDateRangePicker({ from, to, onChange, label, max }: AdminDateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange | undefined>(() => getRange(from, to));
  const [month, setMonth] = useState(() => parseCalendarDate(from) ?? parseCalendarDate(to) ?? new Date());
  const maxDate = max ? parseCalendarDate(max) : undefined;
  const committed = getRange(from, to);
  const canApply = !!draft?.from && !!draft.to && draft.from <= draft.to && (!maxDate || draft.to <= maxDate);

  function changeOpen(next: boolean) {
    if (next) {
      const current = getRange(from, to);
      setDraft(current);
      setMonth(current?.from ?? current?.to ?? maxDate ?? new Date());
    }
    setOpen(next);
  }

  return (
    <Popover open={open} onOpenChange={changeOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="admin-date-range-trigger" aria-label={`${label}: ${rangeLabel(committed)}`}>
          <CalendarDays size={16} aria-hidden="true" />
          <span className={!from && !to ? 'admin-date-range-placeholder' : undefined}>{rangeLabel(committed)}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="admin-date-range-popover" aria-label={label} data-range-complete={!!draft?.from && !!draft.to && draft.from < draft.to}>
        <Calendar
          mode="range"
          month={month}
          onMonthChange={setMonth}
          selected={draft}
          onSelect={setDraft}
          numberOfMonths={1}
          showOutsideDays={false}
          disabled={maxDate ? { after: maxDate } : undefined}
          className="admin-range-calendar"
          classNames={{
            root: 'admin-range-root', months: 'admin-range-months', month: 'admin-range-month',
            month_caption: 'admin-range-caption', caption_label: 'admin-range-caption-label',
            nav: 'admin-range-nav', button_previous: 'admin-range-prev', button_next: 'admin-range-next',
            month_grid: 'admin-range-grid', weekdays: 'admin-range-weekdays', weekday: 'admin-range-weekday',
            week: 'admin-range-week', day: 'admin-range-day', day_button: 'admin-range-day-button',
            selected: 'admin-range-selected', today: 'admin-range-today', outside: 'admin-range-outside',
            disabled: 'admin-range-disabled', hidden: 'admin-range-hidden',
            range_start: 'admin-range-start', range_middle: 'admin-range-middle', range_end: 'admin-range-end',
          }}
        />
        <div className="admin-date-range-footer">
          <span aria-live="polite">{rangeLabel(draft)}</span>
          <div className="admin-date-range-actions">
            <button type="button" onClick={() => setOpen(false)}>Cancel</button>
            <button type="button" disabled={!canApply} onClick={() => {
              if (!canApply || !draft?.from || !draft.to) return;
              onChange(calendarDateKey(draft.from), calendarDateKey(draft.to));
              setOpen(false);
            }}>Apply</button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
