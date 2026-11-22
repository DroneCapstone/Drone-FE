import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CircleCheck, ChevronDown, Loader2, X } from 'lucide-react';
import type { DispatchResourceRecommendation } from '../api/missionApi';

type ResourceTab = 'drone' | 'battery';


/** Present only the deciding facts from BE text, without inventing scores or SHAP. */
function formatSelectionReason(reason: string, tab: ResourceTab): string {
  const text = reason.trim();
  if (tab === 'drone') {
    const capacity = text.match(/capacity\s*\(?\s*(\d+(?:\.\d+)?)\s*kg/i);
    const payload = text.match(/(\d+(?:\.\d+)?)\s*kg\s+payload/i);
    if (capacity && payload) return `${capacity[1]} kg capacity · ${payload[1]} kg payload`;

    if (/stationed.*departure hub|avoids? empty positioning flight|zero positioning flight/i.test(text)) {
      return 'No positioning flight required';
    }

    const utilization = text.match(/utilization\s*(\d+(?:\.\d+)?%)/i);
    if (utilization) return `Fleet utilization: ${utilization[1]}`;

    const reserve = text.match(/(\d+(?:\.\d+)?)%\s*(?:post-flight\s+|battery\s+|remaining\s+|total\s+)?reserve/i);
    if (reserve) return `Energy reserve: ${reserve[1]}%`;
  } else {
    const lifetime = text.match(/(\d+)\s*operational days remaining/i);
    if (lifetime) return `Battery life: ${lifetime[1]} days remaining`;

    const available = text.match(/(\d+(?:\.\d+)?)\s*Wh\s+usable energy/i);
    const demand = text.match(/(?:vs\.?|versus)\s*(\d+(?:\.\d+)?)\s*Wh\s*Leg\s*(\d+)\s*demand/i);
    if (available && demand) {
      return `${available[1]} Wh available · Leg ${demand[2]} needs ${demand[1]} Wh`;
    }

    const charge = text.match(/fully charged\s*\((\d+(?:\.\d+)?)%\s*SoC\)/i);
    if (charge) return `Fully charged · ${charge[1]}%`;

    if (/requires technician mounting/i.test(text)) return 'At hub · Technician mounting required';
  }
  // Unknown BE phrasing: retain the verified source meaning rather than guess.
  return text;
}

function formatAlternativeReason(reason: string): string {
  const text = reason.replace(/^Not selected:\s*/i, '').trim();
  const lifetime = text.match(/(\d+)\s*days remaining[\s\S]*?\((?:Active\s*\()?\s*(\d+)\s*days remaining/i);
  if (/older lifecycle standing/i.test(text) && lifetime) {
    return `Battery life: ${lifetime[1]} vs ${lifetime[2]} days`;
  }
  if (/equivalent charge and health/i.test(text)) return 'Similar charge and battery health · eligible alternative';
  if (/equivalent capabilities/i.test(text)) return 'Similar capabilities · eligible alternative';

  const oversized = text.match(/(\d+(?:\.\d+)?)\s*kg airframe is oversized for the\s*(\d+(?:\.\d+)?)\s*kg parcel/i);
  if (oversized) return `Oversized: ${oversized[1]} kg capacity for ${oversized[2]} kg payload`;

  const hub = text.match(/stationed at\s+(.+?)\s*\((\d+(?:\.\d+)?)\s*km away\)/i);
  if (hub) return `${hub[1]} · ${hub[2]} km positioning flight`;
  return text;
}

type Props = {
  open: boolean;
  onClose: () => void;
  onRetry: () => void;
  recommendation: DispatchResourceRecommendation | null;
  selectedDroneId: string;
  selectedBatteryId: string;
  loading: boolean;
  error: string;
};

/** Explains the BE's original recommendation, not a manually overridden choice.
 * Route analysis remains in the existing View AI details page. */
export function ResourceExplanationPopup({
  open, onClose, onRetry, recommendation, loading, error,
}: Props) {
  const [tab, setTab] = useState<ResourceTab>('drone');
  const [alternativesOpen, setAlternativesOpen] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Each opening starts with a compact, collapsed explanation.
  useEffect(() => {
    if (!open) return;
    setTab('drone');
    setAlternativesOpen(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
      } else if (event.key === 'Tab' && dialogRef.current) {
        const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLButtonElement>('button:not([disabled])'));
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;
  const details = tab === 'drone' ? recommendation?.droneExplanation : recommendation?.batteryExplanation;
  const suggestedId = tab === 'drone' ? recommendation?.selectedDroneId : recommendation?.selectedBatteryId;
  const alternatives = details?.whyNotOthers ?? [];

  return createPortal(
    <div className="mission-resource-popup-backdrop" onMouseDown={(event) => {
      if (event.currentTarget === event.target) onClose();
    }}>
      <section
        ref={dialogRef}
        className="mission-resource-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mission-resource-popup-heading"
      >
        <header className="mission-resource-popup-header">
          <h2 id="mission-resource-popup-heading" className="mission-resource-popup-title">Resource explanation</h2>
          <button ref={closeRef} type="button" className="mission-resource-popup-close" aria-label="Close resource explanation" onClick={onClose}>
            <X size={16} aria-hidden="true" />
          </button>
        </header>

        <div className="mission-resource-popup-tabs" role="tablist" aria-label="Resource type">
          {(['drone', 'battery'] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="tab"
              id={`mission-resource-tab-${option}`}
              aria-controls="mission-resource-popup-tab-panel"
              aria-selected={tab === option}
              className={tab === option ? 'is-active' : ''}
              onClick={() => { setTab(option); setAlternativesOpen(false); }}
            >{option === 'drone' ? 'Drone' : 'Battery'}</button>
          ))}
        </div>

        <div id="mission-resource-popup-tab-panel" className="mission-resource-popup-content" role="tabpanel" aria-labelledby={`mission-resource-tab-${tab}`}>
          {loading && !recommendation ? (
            <p className="mission-resource-popup-feedback" role="status"><Loader2 size={16} className="mission-resource-popup-spinner" /> Loading explanation…</p>
          ) : !recommendation ? (
            <div className="mission-resource-popup-feedback" role="alert">
              <span>{error || 'No recommendation available.'}</span>
              <button type="button" className="mission-resource-popup-retry" onClick={onRetry} disabled={loading}>Retry</button>
            </div>
          ) : (
            <>
              <div className="mission-resource-popup-identity">
                <strong>{details?.selectedId || suggestedId || '—'}</strong>
              </div>
              <h3 className="mission-resource-popup-subtitle">Why selected</h3>
              {details?.reasonsSelected.length ? (
                <ul className="mission-resource-popup-reasons">
                  {details.reasonsSelected.map((reason, index) => (
                    <li key={`${index}-${reason}`}><CircleCheck size={15} strokeWidth={2} aria-hidden="true" /><span>{formatSelectionReason(reason, tab)}</span></li>
                  ))}
                </ul>
              ) : (
                <p className="mission-resource-popup-feedback">No reasons provided by BE.</p>
              )}
              <div className={`mission-resource-popup-alternatives${alternativesOpen ? ' is-open' : ''}`}>
                <button
                  type="button"
                  className="mission-resource-popup-alternatives-toggle"
                  aria-expanded={alternativesOpen}
                  aria-controls={alternativesOpen ? 'mission-resource-popup-alternative-list' : undefined}
                  onClick={() => setAlternativesOpen((value) => !value)}
                >
                  <span>Other eligible options</span>
                  <span className="mission-resource-popup-alternatives-right">
                    <span className="mission-resource-popup-count">{alternatives.length}</span>
                    <ChevronDown size={16} aria-hidden="true" />
                  </span>
                </button>
                {alternativesOpen && (
                  <div id="mission-resource-popup-alternative-list" className="mission-resource-popup-alternative-list">
                    {alternatives.length ? alternatives.map((alternative) => (
                      <article key={alternative.id} className="mission-resource-popup-alternative">
                        <strong>{alternative.label}</strong>
                        <p>{formatAlternativeReason(alternative.reason)}</p>
                      </article>
                    )) : <p className="mission-resource-popup-empty">No other options were provided.</p>}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        <footer className="mission-resource-popup-footer">
          <button type="button" className="mission-resource-popup-done" onClick={onClose}>Close</button>
        </footer>
      </section>
    </div>, document.body,
  );
}
