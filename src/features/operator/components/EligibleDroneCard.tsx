import { Icon } from '../../../components/ui/Icon';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import type { DroneEligibilityResult, OperatorDrone } from '../types/operator';

interface EligibleDroneCardProps {
  drone: OperatorDrone;
  eligibility: DroneEligibilityResult;
  selected?: boolean;
  onSelect?: () => void;
}

export function EligibleDroneCard({ drone, eligibility, selected = false, onSelect }: EligibleDroneCardProps) {
  return (
    <button
      type="button"
      className={`eligible-drone-card selectable-card ${selected ? 'active' : ''}`}
      disabled={!eligibility.eligible}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <div className="eligible-drone-head">
        <span className="eligible-drone-icon"><Icon name="drone" size={18} /></span>
        <div>
          <strong>{drone.name}</strong>
          <small>ID {drone.displayId} · {drone.model}</small>
        </div>
        <StatusBadge tone={eligibility.eligible ? 'success' : 'neutral'}>
          {eligibility.eligible ? 'Candidate' : 'Unavailable'}
        </StatusBadge>
      </div>

      <div
        className="eligible-drone-meta"
        style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}
      >
        <span><small>Technical</small><strong>{drone.technicalStatus}</strong></span>
        <span><small>Max payload</small><strong>{drone.maxPayloadKg} kg</strong></span>
      </div>

      {!eligibility.eligible && eligibility.reasons.length > 0 && (
        <p className="eligible-drone-reason">{eligibility.reasons[0]}</p>
      )}
    </button>
  );
}
