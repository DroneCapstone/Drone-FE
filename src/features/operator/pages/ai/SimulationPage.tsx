import { useState } from 'react';
import { ActionButton } from '../../../../components/ui/ActionButton';
import { Icon } from '../../../../components/ui/Icon';
import { AreaChart } from '../../components/AreaChart';
import { MetricCard } from '../../components/MetricCard';
import { OperatorPanel } from '../../components/OperatorPanel';
import { AiPageShell } from './AiPageShell';

export function SimulationPage() {
  const [payload, setPayload] = useState(4.8);
  const [altitude, setAltitude] = useState(120);
  const [speed, setSpeed] = useState(54);
  const [weather, setWeather] = useState('Light wind');
  const projected = Math.round(20 + payload * 1.7 + altitude / 45 + speed / 25 + (weather === 'Heavy wind' ? 8 : weather === 'Rain' ? 5 : 0));
  const reset = () => { setPayload(4.8); setAltitude(120); setSpeed(54); setWeather('Light wind'); };
  return <AiPageShell active="/operator/ai/simulation"><div className="simulation-layout"><OperatorPanel title="Scenario controls" eyebrow="WHAT-IF INPUTS"><div className="slider-field"><span><label>Payload</label><strong>{payload.toFixed(1)} kg</strong></span><input type="range" min="1" max="10" step=".1" value={payload} onChange={(e)=>setPayload(Number(e.target.value))}/></div><div className="slider-field"><span><label>Altitude</label><strong>{altitude} m</strong></span><input type="range" min="50" max="250" value={altitude} onChange={(e)=>setAltitude(Number(e.target.value))}/></div><div className="slider-field"><span><label>Cruise speed</label><strong>{speed} km/h</strong></span><input type="range" min="30" max="80" value={speed} onChange={(e)=>setSpeed(Number(e.target.value))}/></div><label className="select-field"><span>Weather condition</span><select value={weather} onChange={(e)=>setWeather(e.target.value)}><option>Light wind</option><option>Heavy wind</option><option>Rain</option><option>Clear</option></select></label><ActionButton variant="secondary" onClick={reset}>Reset baseline</ActionButton></OperatorPanel><div className="simulation-results"><OperatorPanel title="Scenario impact" eyebrow="LIVE MODEL OUTPUT"><div className="scenario-comparison"><div><span>Baseline</span><strong>28.6%</strong><small>Energy consumed</small></div><Icon name="arrow"/><div className={projected>32?'negative':'positive'}><span>Scenario</span><strong>{projected.toFixed(1)}%</strong><small>{projected>29?`+${(projected-28.6).toFixed(1)}% increase`:`${(projected-28.6).toFixed(1)}% change`}</small></div></div><AreaChart orange variant="simulation" unit="battery used (%)" yLabels={['40','30','20','10']} pointLabel={`Scenario predicts ${projected}% consumption`}/></OperatorPanel><div className="metric-grid two"><MetricCard label="Duration" value={`${Math.round(31-speed/12+payload/3)} min`} delta={speed>54?'Faster':'Baseline'} note="Arrival estimate"/><MetricCard label="Recommended route" value="R-04" delta="Best fit" note="Compared across 3 routes"/></div></div></div></AiPageShell>;
}
