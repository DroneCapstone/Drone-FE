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
      <label className="filter-search">
        <Search size={15} />
        <input value={searchValue} onChange={(event) => onSearchChange(event.target.value)} placeholder={placeholder} />
      </label>
      {filters}
      <span className="toolbar-spacer" />
      {meta ? <small>{meta}</small> : null}
    </div>
  );
}
