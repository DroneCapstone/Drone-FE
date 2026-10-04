import { useEffect, useRef, useState } from "react";

import { Icon } from "../../ui/Icon";

export function CommandSearch({
  open,
  onClose,
  onOpen,
  placeholder = "Search missions, flights, routes...",
  ariaLabel = "Search navigation",
}: {
  open: boolean;
  onClose: () => void;
  onOpen: () => void;
  placeholder?: string;
  ariaLabel?: string;
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
      if (!rootRef.current?.contains(event.target as Node)) onClose();
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
          placeholder={placeholder}
          aria-label={ariaLabel}
          aria-expanded={open}
        />
      </div>
    </div>
  );
}
