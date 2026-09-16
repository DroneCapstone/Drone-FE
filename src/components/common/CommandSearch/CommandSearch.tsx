import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { operatorNavigation } from "../../../constants/operatorNavigation";
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const quickItems = operatorNavigation
    .filter((item) =>
      item.label.toLowerCase().includes(query.trim().toLowerCase()),
    )
    .slice(0, 5);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpen();
      }
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, onOpen]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);
  if (!open) return null;

  return (
    <div
      className="command-layer"
      role="dialog"
      aria-modal="true"
      aria-label="Quick navigation"
      onMouseDown={onClose}
    >
      <div
        className="command-panel"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="command-input">
          <Icon name="search" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Quick search…"
          />
          <kbd>ESC</kbd>
        </div>
        <div className="command-results">
          <small>QUICK NAVIGATION</small>
          {quickItems.length ? (
            quickItems.map((item) => (
              <NavLink
                to={item.path}
                key={item.path}
                onClick={() => {
                  setQuery("");
                  onClose();
                }}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
                <Icon name="arrow" />
              </NavLink>
            ))
          ) : (
            <p className="command-empty">No matching page</p>
          )}
        </div>
      </div>
    </div>
  );
}
