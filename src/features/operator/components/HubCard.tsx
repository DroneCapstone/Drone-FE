import { formatHubName, formatAddress } from '../utils/displayEnglish';
import { Icon } from '../../../components/ui/Icon';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import type { Hub } from '../types/operator';

interface HubCardProps {
  hub: Hub;
  totalDrones: number | null;
  totalBatteries: number | null;
  showArea?: boolean;
  onSelectDrones: () => void;
  onSelectBatteries: () => void;
}

/** Only the two framed figures navigate; the header and status are not buttons. */
export function HubCard({
  hub,
  totalDrones,
  totalBatteries,
  showArea = true,
  onSelectDrones,
  onSelectBatteries,
}: HubCardProps) {
  return (
    <article className="hub-card hub-resource-card">
      <div className="hub-card-head">
        <div>
          {showArea && hub.area && <span className="eyebrow">{formatAddress(hub.area)}</span>}
          <h3>{formatHubName(hub.name)}</h3>
        </div>
        <StatusBadge tone={hub.status === 'Active' ? 'success' : 'neutral'}>
          {hub.status}
        </StatusBadge>
      </div>

      <div className="hub-card-location">
        <Icon name="pin" size={16} />
        <span>{formatAddress(hub.address) || 'Address unavailable'}</span>
      </div>

      <div className="hub-resource-stats">
        <button
          type="button"
          className="hub-resource-stat"
          onClick={onSelectDrones}
          aria-label={`View drones at ${formatHubName(hub.name)}`}
          title={`View drones at ${formatHubName(hub.name)}`}
        >
          <small>Total drones</small>
          <strong>{totalDrones ?? '—'}</strong>
        </button>
        <button
          type="button"
          className="hub-resource-stat"
          onClick={onSelectBatteries}
          aria-label={`View batteries at ${formatHubName(hub.name)}`}
          title={`View batteries at ${formatHubName(hub.name)}`}
        >
          <small>Total batteries</small>
          <strong>{totalBatteries ?? '—'}</strong>
        </button>
      </div>
    </article>
  );
}
