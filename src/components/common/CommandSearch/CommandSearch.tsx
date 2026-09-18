import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink } from "react-router-dom";

import { operatorNavigation } from "../../../constants/operatorNavigation";
// import { Icon } from "../../ui/Icon";
import { Icon, type IconName } from "../../ui/Icon";

// type SearchItem = {
//   label: string;
//   path: string;
//   icon: string;
//   parent?: string;
// };

type SearchItem = {
  label: string;
  path: string;
  icon: IconName;
  parent?: string;
};
export function CommandSearch({
  open,
  onClose,
  onOpen,
}: {
  open: boolean;
  onClose: () => void;
  onOpen: () => void;
}) {
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const searchableItems = useMemo<SearchItem[]>(() => {
    return operatorNavigation.flatMap((item) => [
      {
        label: item.label,
        path: item.path,
        icon: item.icon,
      },
      ...(item.children ?? []).map((child) => ({
        label: child.label,
        path: child.path,
        icon: item.icon,
        parent: item.label,
      })),
    ]);
  }, []);

  const normalizedQuery = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!normalizedQuery) return searchableItems.slice(0, 7);

    return searchableItems
      .filter((item) => {
        const searchableText = `${item.parent ?? ""} ${item.label}`.toLowerCase();
        return searchableText.includes(normalizedQuery);
      })
      .slice(0, 7);
  }, [normalizedQuery, searchableItems]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpen();
        requestAnimationFrame(() => inputRef.current?.focus());
        return;
      }

      if (event.key === "Escape" && open) {
        onClose();
        inputRef.current?.blur();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, onOpen, open]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [onClose]);

  const closeAfterNavigate = () => {
    setQuery("");
    onClose();
  };

  return (
    <div ref={rootRef} className={`header-search ${open ? "is-open" : ""}`}>
      <div className="header-search-control">
        <Icon name="search" size={18} />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onFocus={onOpen}
          onChange={(event) => {
            setQuery(event.target.value);
            if (!open) onOpen();
          }}
          placeholder="Search missions, flights, routes..."
          aria-label="Search operator navigation"
          aria-expanded={open}
          aria-controls="operator-search-results"
        />
        {/* <kbd>Ctrl K</kbd> */}
      </div>

      {/* {open && (
        <div
          id="operator-search-results"
          className="header-search-results"
          role="listbox"
        >
          <small>{normalizedQuery ? "SEARCH RESULTS" : "QUICK NAVIGATION"}</small>

          {results.length ? (
            results.map((item) => (
              <NavLink
                key={`${item.path}-${item.label}`}
                to={item.path}
                className="header-search-result"
                onClick={closeAfterNavigate}
              >
                <Icon name={item.icon} size={17} />
                <span>
                  <strong>{item.label}</strong>
                  {item.parent && <small>{item.parent}</small>}
                </span>
                <Icon name="arrow" size={15} />
              </NavLink>
            ))
          ) : (
            <p className="header-search-empty">No matching page</p>
          )}
        </div>
      )} */}


    </div>
  );
}
