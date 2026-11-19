import './operator-loading-state.css';

/** A centered and accessible loading state for Operator screens. */
export function OperatorLoadingState({ label, compact = false }: { label: string; compact?: boolean }) {
  return <div className={`operator-loading-state ${compact ? 'operator-loading-compact' : ''}`} role="status" aria-live="polite" aria-busy="true">
    <span className="operator-loading-ring" aria-hidden="true" />
    <span className="operator-loading-label">{label}</span>
  </div>;
}
