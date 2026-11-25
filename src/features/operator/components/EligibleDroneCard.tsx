import { formatHubName, formatBackendLabel } from '../utils/displayEnglish';
import { Icon } from '../../../components/ui/Icon';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import type { DroneEligibilityResult, OperatorDrone } from '../types/operator';

interface EligibleDroneCardProps {
  drone: OperatorDrone;
  eligibility: DroneEligibilityResult;
  selected?: boolean;
  onSelect?: () => void;
  /** Show the same check-circle selection cue used by Route cards. */
  routeSelectionIndicator?: boolean;
}

export function EligibleDroneCard({ drone, eligibility, selected = false, onSelect, routeSelectionIndicator = false }: EligibleDroneCardProps) {
  return (
    <button
      type="button"
      className={`eligible-drone-card selectable-card ${selected ? 'active' : ''}`}
      disabled={!eligibility.eligible}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <div className="eligible-drone-head">
        <span className={routeSelectionIndicator ? 'mission-resource-editor-drone-icon' : 'eligible-drone-icon'}>
          {routeSelectionIndicator ? (
            <span className={`mission-resource-editor-choice-radio${selected ? ' is-checked' : ''}`} aria-hidden="true">
              {selected && <Icon name="check" size={12} />}
            </span>
          ) : <Icon name="drone" size={18} />}
        </span>
        <div>
          <strong>{drone.id}</strong>
          <small>{drone.model}</small>
        </div>
        {(!routeSelectionIndicator || !eligibility.eligible) && (
          <StatusBadge tone={!eligibility.eligible ? 'neutral' : selected ? 'warning' : 'success'}>
            {!eligibility.eligible ? 'Unavailable' : selected ? 'Selected' : 'Available'}
          </StatusBadge>
        )}
      </div>

      <div className="eligible-drone-meta" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <span><small>Max payload</small><strong>{drone.maxPayloadKg} kg</strong></span>
        <span><small>Required battery</small><strong>{drone.batteryModel || '—'}</strong></span>
      </div>

      {drone.isCrossHub && (
        <p className="eligible-drone-reason">Cross-hub dispatch · {formatHubName(drone.hubName || `Hub ${drone.hubId}`)}</p>
      )}
      {!eligibility.eligible && eligibility.reasons.length > 0 && (
        <p className="eligible-drone-reason">{formatBackendLabel(eligibility.reasons[0])}</p>
      )}
    </button>
  );
}
