import { Icon } from '../../../components/ui/Icon';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import type { Hub } from '../types/operator';

interface HubCardProps {
  hub: Hub;
  totalDrones: number;
  readyDrones: number;
  awaitingPickup?: number;
  contactRequired?: number;
  disposalRequired?: number;
  showArea?: boolean;
  selected?: boolean;
  onSelect?: () => void;
}

export function HubCard({
  hub,
  totalDrones,
  readyDrones,
  awaitingPickup,
  contactRequired,
  disposalRequired,
  showArea = true,
  selected = false,
  onSelect,
}: HubCardProps) {
  const showPackageStats =
    awaitingPickup !== undefined ||
    contactRequired !== undefined ||
    disposalRequired !== undefined;

  const content = (
    <>
      <div className="hub-card-head">
        <div>
          {showArea && <span className="eyebrow">{hub.area}</span>}
          <h3>{hub.name}</h3>
        </div>

        <StatusBadge tone={hub.status === 'Active' ? 'success' : 'neutral'}>
          {hub.status}
        </StatusBadge>
      </div>

      <div className="hub-card-location">
        <Icon name="pin" size={16} />
        <span>{hub.address}</span>
      </div>

      <div className="hub-card-stats">
        <span>
          <small>Total drones</small>
          <strong>{totalDrones}</strong>
        </span>
        <span>
          <small>Ready now</small>
          <strong>{readyDrones}</strong>
        </span>
        {showPackageStats && (
          <span>
            <small>Awaiting pickup</small>
            <strong>{awaitingPickup ?? 0}</strong>
          </span>
        )}
        {showPackageStats && (
          <span>
            <small>Contact required</small>
            <strong>{contactRequired ?? 0}</strong>
          </span>
        )}
        {showPackageStats && (
          <span>
            <small>Disposal required</small>
            <strong>{disposalRequired ?? 0}</strong>
          </span>
        )}
      </div>
    </>
  );

  if (onSelect) {
    return (
      <button
        type="button"
        className={`hub-card selectable-card ${selected ? 'active' : ''}`}
        onClick={onSelect}
        aria-pressed={selected}
      >
        {content}
      </button>
    );
  }

  return <div className="hub-card">{content}</div>;
}
