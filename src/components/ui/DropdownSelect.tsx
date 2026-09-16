import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from './Icon';

interface DropdownSelectProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
}

export function DropdownSelect({ value, options, onChange, ariaLabel, className = '' }: DropdownSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  return <div className={`dropdown-select ${open ? 'is-open' : ''} ${className}`} ref={rootRef}>
    <button type="button" className="dropdown-trigger" aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} onClick={() => setOpen((current) => !current)}>
      <span>{value}</span><Icon name="chevron" size={15}/>
    </button>
    {open && <div className="dropdown-menu" id={listId} role="listbox" aria-label={ariaLabel}>
      {options.map((option) => <button type="button" role="option" aria-selected={option === value} className={option === value ? 'selected' : ''} onClick={() => { onChange(option); setOpen(false); }} key={option}>{option}</button>)}
    </div>}
  </div>;
}
