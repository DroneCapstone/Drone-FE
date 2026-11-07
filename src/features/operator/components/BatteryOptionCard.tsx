import { Icon } from '../../../components/ui/Icon';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import type { OperatorBattery } from '../types/operator';

interface BatteryOptionCardProps {
  battery: OperatorBattery;
  selected?: boolean;
  onSelect?: () => void;
}

export function BatteryOptionCard({ battery, selected = false, onSelect }: BatteryOptionCardProps) {
  return (
    <button
      type="button"
      className={`eligible-drone-card selectable-card ${selected ? 'active' : ''}`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <div className="eligible-drone-head">
        <span className="eligible-drone-icon"><Icon name="battery" size={18} /></span>
        <div>
          <strong>{battery.serialNumber}</strong>
          <small>{battery.capacityWh} Wh · {battery.hubName || battery.currentHubId}</small>
        </div>
        <StatusBadge tone="success">{battery.status}</StatusBadge>
      </div>
      <div className="eligible-drone-meta" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <span><small>Charge</small><strong>{battery.chargeLevelPct}%</strong></span>
        <span><small>Battery ID</small><strong>{battery.id}</strong></span>
      </div>
    </button>
  );
}
