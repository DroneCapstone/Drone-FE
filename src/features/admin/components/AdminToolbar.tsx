import { Search } from "lucide-react";
import type { ReactNode } from "react";

export function AdminToolbar({
  searchValue,
  onSearchChange,
  placeholder = "Search…",
  filters,
  meta,
}: {
  searchValue: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  filters?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <div className="toolbar">
      <div className="filter-search">
        <Search size={16} aria-hidden="true" />
        <input value={searchValue} onChange={(event) => onSearchChange(event.target.value)} placeholder={placeholder} aria-label={placeholder} />
      </div>
      {filters}
      <span className="toolbar-spacer" />
      {meta ? <small>{meta}</small> : null}
    </div>
  );
}
