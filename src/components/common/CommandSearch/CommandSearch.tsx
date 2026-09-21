import { useEffect, useRef, useState } from "react";

import { Icon } from "../../ui/Icon";
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
