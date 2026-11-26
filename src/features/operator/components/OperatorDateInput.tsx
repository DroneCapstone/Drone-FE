import { useEffect, useId, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { Calendar } from '../../../components/ui/Calendar';
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '../../../components/ui/Popover';
// Reuse Admin's existing calendar skin without changing Admin or shared components.
import '../../admin/components/AdminDateRangePicker.css';
import './operator-date-input.css';

interface OperatorDateInputProps {
  value: string; // YYYY-MM-DD, or empty (no filter)
  onChange: (value: string) => void;
  label: string;
}

export function parseOperatorDate(value: string): Date | undefined {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return undefined;
  const [, dd, mm, yyyy] = match;
  const day = Number(dd), month = Number(mm), year = Number(yyyy);
  if (year < 1) return undefined;
  // Construct in local time; do not convert date-only filters through UTC.
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : undefined;
}

export function operatorDateKey(date: Date): string {
  return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function displayDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '';
}

export function OperatorDateInput({ value, onChange, label }: OperatorDateInputProps) {
  const errorId = useId();
  const [text, setText] = useState(() => displayDate(value));
  const [invalid, setInvalid] = useState(false);
  const [open, setOpen] = useState(false);
  const selected = parseOperatorDate(displayDate(value));
  const [month, setMonth] = useState(() => selected ?? new Date());

  useEffect(() => {
    setText(displayDate(value));
    setInvalid(false);
  }, [value]);

  function updateText(next: string) {
    setText(next);
    setInvalid(false);
    const date = parseOperatorDate(next);
    const key = date ? operatorDateKey(date) : next === '' ? '' : null;
    // Never send a partially typed or invalid date to the URL/filter.
    if (key !== null && key !== value) onChange(key);
  }

  function validate() {
    setInvalid(text !== '' && !parseOperatorDate(text));
  }

  function changeOpen(next: boolean) {
    if (next) setMonth(parseOperatorDate(text) ?? selected ?? new Date());
    setOpen(next);
  }

  return (
    <Popover open={open} onOpenChange={changeOpen}>
      <div className="operator-date-field">
        <PopoverAnchor asChild>
          <div className="operator-date-control">
            <input
              type="text"
              className="operator-date-input"
              aria-label={label}
              aria-invalid={invalid || undefined}
              aria-describedby={invalid ? errorId : undefined}
              placeholder="dd/mm/yyyy"
              autoComplete="off"
              spellCheck={false}
              maxLength={10}
              value={text}
              onChange={e => updateText(e.target.value)}
              onBlur={validate}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); validate(); }
                if (e.key === 'Escape' && !open) { setText(displayDate(value)); setInvalid(false); }
              }}
            />
            <PopoverTrigger asChild>
              <button type="button" className="operator-date-icon" aria-label={`Open calendar: ${label}`} title="Open calendar">
                <CalendarDays size={16} aria-hidden="true" />
              </button>
            </PopoverTrigger>
          </div>
        </PopoverAnchor>
        {invalid && <span id={errorId} className="operator-date-error" role="alert">Enter a valid date (dd/mm/yyyy).</span>}
      </div>
      <PopoverContent align="end" sideOffset={8} className="admin-date-range-popover operator-date-popover" aria-label={label}>
        <Calendar
          mode="single"
          month={month}
          onMonthChange={setMonth}
          selected={selected}
          onSelect={date => {
            if (!date) return;
            const key = operatorDateKey(date);
            setText(displayDate(key));
            setInvalid(false);
            if (key !== value) onChange(key);
            setOpen(false);
          }}
          required
          numberOfMonths={1}
          showOutsideDays={false}
          className="admin-range-calendar"
          classNames={{
            root: 'admin-range-root', months: 'admin-range-months', month: 'admin-range-month',
            month_caption: 'admin-range-caption', caption_label: 'admin-range-caption-label',
            nav: 'admin-range-nav', button_previous: 'admin-range-prev', button_next: 'admin-range-next',
            month_grid: 'admin-range-grid', weekdays: 'admin-range-weekdays', weekday: 'admin-range-weekday',
            week: 'admin-range-week', day: 'admin-range-day', day_button: 'admin-range-day-button',
            selected: 'admin-range-selected', today: 'admin-range-today', outside: 'admin-range-outside',
            disabled: 'admin-range-disabled', hidden: 'admin-range-hidden',
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
