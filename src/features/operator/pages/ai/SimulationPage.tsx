import { useState } from 'react';
import { ActionButton } from '../../../../components/ui/ActionButton';
import { DropdownSelect } from '../../../../components/ui/DropdownSelect';
import { Icon } from '../../../../components/ui/Icon';
import { AreaChart } from '../../components/AreaChart';
import { MetricCard } from '../../components/MetricCard';
import { OperatorPanel } from '../../components/OperatorPanel';
import { AiPageShell } from './AiPageShell';

export function SimulationPage() {
  const [payload, setPayload] = useState(3.2);
  const [altitude, setAltitude] = useState(120);
  const [speed, setSpeed] = useState(54);
  const [weather, setWeather] = useState('Light wind');
  const projected = Math.round(15 + payload * 1.9 + altitude / 48 + speed / 28 + (weather === 'Heavy wind' ? 8 : weather === 'Rain' ? 5 : 0));
  const reset = () => { setPayload(3.2); setAltitude(120); setSpeed(54); setWeather('Light wind'); };

  return (
    <AiPageShell active="/operator/ai/simulation">
      <div className="simulation-sandbox-note"><strong>Sandbox only.</strong><span>Changing these values never edits a real Order or Flight Mission.</span></div>
      <div className="simulation-layout">
        <OperatorPanel title="Scenario controls" eyebrow="WHAT-IF INPUTS">
          <div className="slider-field"><span><label>Payload</label><strong>{payload.toFixed(1)} kg</strong></span><input type="range" min="1" max="10" step=".1" value={payload} onChange={(e) => setPayload(Number(e.target.value))} /></div>
          <div className="slider-field"><span><label>Altitude</label><strong>{altitude} m</strong></span><input type="range" min="50" max="250" value={altitude} onChange={(e) => setAltitude(Number(e.target.value))} /></div>
          <div className="slider-field"><span><label>Cruise speed</label><strong>{speed} km/h</strong></span><input type="range" min="30" max="80" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} /></div>
          <label className="select-field"><span>Weather condition</span><DropdownSelect className="w-full min-w-0" value={weather} options={['Light wind', 'Heavy wind', 'Rain', 'Clear']} onChange={setWeather} ariaLabel="Weather condition" /></label>
          <ActionButton variant="secondary" onClick={reset}>Reset baseline</ActionButton>
        </OperatorPanel>

        <div className="simulation-results">
          <OperatorPanel title="Scenario impact" eyebrow="SIMULATED MODEL OUTPUT">
            <div className="scenario-comparison"><div><span>Baseline</span><strong>21.8 Wh</strong><small>Reference route</small></div><Icon name="arrow" /><div className={projected > 30 ? 'negative' : 'positive'}><span>Scenario</span><strong>{projected.toFixed(1)} Wh</strong><small>{projected > 22 ? `+${(projected - 21.8).toFixed(1)} Wh` : `${(projected - 21.8).toFixed(1)} Wh`}</small></div></div>
            <AreaChart orange variant="simulation" unit="energy (Wh)" yLabels={['40', '30', '20', '10']} pointLabel={`Scenario predicts ${projected} Wh`} />
          </OperatorPanel>
          <div className="metric-grid two">
            <MetricCard label="Duration" value={`${Math.round(31 - speed / 12 + payload / 3)} min`} delta={speed > 54 ? 'Faster' : 'Baseline'} note="Simulated arrival effect" />
            <MetricCard label="Suggested route" value={projected > 30 ? 'R-12' : 'R-04'} delta="Sandbox" note="No Mission is modified" />
          </div>
        </div>
      </div>
    </AiPageShell>
  );
}
