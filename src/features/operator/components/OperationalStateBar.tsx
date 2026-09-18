import { Icon } from '../../../components/ui/Icon';

export function OperationalStateBar() {
  return <div className="operational-state" aria-label="Live data status">
    <span><i className="state-live" /><strong>Telemetry nominal</strong></span>
    <span><small>Feeds</small><strong>8 / 8</strong></span>
    <span><small>Median latency</small><strong>280 ms</strong></span>
    <span><small>Last packet </small><strong>14:18:42 ICT</strong></span>
    <span className="state-source"><Icon name="radar" size={15} />SGN Control / ADS-B + LTE</span>
  </div>;
}
