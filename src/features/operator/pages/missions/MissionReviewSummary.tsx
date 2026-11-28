import type { ReactNode } from 'react';
import { BarChart3, BatteryFull, Clock, Cpu, Leaf, Package, Route, Zap } from 'lucide-react';
import { Icon } from '../../../../components/ui/Icon';
import type { EligibleMissionBattery } from '../../api/missionApi';
import type { Order, OperatorDrone, RouteOption } from '../../types/operator';
import { formatHubName, formatRouteName } from '../../utils/displayEnglish';
import { DEFAULT_BATTERY_RESERVE_PCT } from '../../utils/droneEligibility';
import { getDroneDisplayCode } from '../../utils/droneDisplay';
import { getRouteLegBatteryUse } from '../../utils/routeBatteryUse';
import { formatMissionTime } from '../../utils/missionTiming';
import './mission-review-summary.css';

type Props = {
  order: Order;
  drone: OperatorDrone;
  battery?: EligibleMissionBattery;
  batteryId: string;
  route: RouteOption;
  timing: { plannedStartAt: Date; estimatedArrivalAt: Date };
  originLabel: string;
  destinationLabel: string;
  relayHubIds: string[];
  swapHubIds: string[];
  hubName: (id: string) => string;
};

const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
const measure = (n: number | undefined, unit: string, decimals = 1) => finite(n) ? `${Number(n.toFixed(decimals))}${unit}` : '—';
const energy = (n: number | undefined) => finite(n) ? `${n.toFixed(1)} Wh` : '—';
const pct = (n: number | undefined) => finite(n) && n >= 0 && n <= 100 ? `${n}%` : '—';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="mr-field"><dt>{label}</dt><dd>{children}</dd></div>;
}
function Section({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return <section className="mr-card"><h3 className="mr-heading">{icon}{title}</h3>{children}</section>;
}

/** Read-only projection of the selected Analyze response. Never used for Assign validation. */
export function buildReviewSummary({ order, drone, battery, batteryId, route, originLabel, destinationLabel, relayHubIds, swapHubIds, hubName }: Props) {
  const resolveHub = (id: string | undefined, name?: string, code?: string) => formatHubName(name) ||
    (id === order.originHubId ? originLabel : id === order.destinationHubId ? destinationLabel :
      id === drone.hubId && drone.hubName ? formatHubName(drone.hubName) : id ? hubName(id) : '') || code || '—';
  const detailed = route.legDetails ?? [];
  const mapped = route.legs ?? [];
  const aligned = detailed.length === mapped.length;
  const uses = getRouteLegBatteryUse(route);
  // If a detail is absent, keep the corresponding mapped leg instead of
  // shifting indices and attributing another battery's values to it.
  const sources = mapped.length > detailed.length ? mapped.map((leg, i) => ({
    m: leg, d: detailed.find(d => d.from_hub_id != null && d.to_hub_id != null &&
      String(d.from_hub_id) === leg.fromHubId && String(d.to_hub_id) === leg.toHubId), i,
  })) : detailed.map((d, i) => ({ d, m: aligned ? mapped[i] : mapped.find(m =>
    d.from_hub_id != null && d.to_hub_id != null && m.fromHubId === String(d.from_hub_id) && m.toHubId === String(d.to_hub_id)), i }));
  const legs = sources.map(({d,m,i}) => {
    const fromId = d?.from_hub_id != null ? String(d.from_hub_id) : m?.fromHubId;
    const toId = d?.to_hub_id != null ? String(d.to_hub_id) : m?.toHubId;
    const isDispatch = d?.is_dispatch === true || d?.leg_type?.toUpperCase() === 'DISPATCH' ||
      (drone.isCrossHub === true && fromId === drone.hubId && toId === order.originHubId);
    // Reuse the shared percentage helper for each matching pair, including
    // the start/end SOC fallback; never use the whole-route % for a relay leg.
    const use = aligned ? uses[i]?.batteryUsePct : getRouteLegBatteryUse({ ...route, legDetails: d ? [d] : [], legs: m ? [m] : [] })[0]?.batteryUsePct;
    return { fromId, toId, from: resolveHub(fromId,d?.from_hub_name,d?.from_hub_code), to: resolveHub(toId,d?.to_hub_name,d?.to_hub_code),
      distance: d?.distance_km, energy: d?.energy_wh ?? m?.predictedEnergyWh, use,
      batteryId: d?.battery_id ?? m?.batteryId, model: d?.battery_model ?? m?.batteryModel,
      charge: d?.battery_charge_pct ?? m?.batteryChargePct, isDispatch };
  });
  const singleDelivery = !drone.isCrossHub && relayHubIds.length === 0 && legs.length <= 1;
  if (!legs.length && singleDelivery) legs.push({ fromId: order.originHubId, toId: order.destinationHubId,
    from: originLabel, to: destinationLabel, distance: route.distanceKm, energy: route.predictedEnergyWh,
    use: route.batteryConsumptionPct, batteryId, model: battery?.model, charge: battery?.chargeLevelPct, isDispatch: false });
  if (singleDelivery && legs.length === 1) {
    legs[0] = {...legs[0], distance: legs[0].distance ?? route.distanceKm,
      energy: legs[0].energy ?? route.predictedEnergyWh, use: legs[0].use ?? route.batteryConsumptionPct};
  }
  const path = legs.length ? [{id: legs[0].fromId, name: legs[0].from}, ...legs.map(l => ({id:l.toId,name:l.to}))] :
    [...(drone.isCrossHub ? [{id: drone.hubId,name: resolveHub(drone.hubId)}] : []),
      {id:order.originHubId,name:originLabel}, ...relayHubIds.map(id => ({id,name:resolveHub(id)})), {id:order.destinationHubId,name:destinationLabel}];
  const startHub = drone.isCrossHub ? drone.hubId : order.originHubId;
  const firstLeg = legs.find(l => l.fromId === startHub) ?? legs[0];
  const firstLegMatches = !firstLeg?.batteryId || firstLeg.batteryId === batteryId;
  const batteries: {hub: string; role: string; id?: string; model?: string; charge?: number}[] = [
    {hub: resolveHub(startHub), role: drone.isCrossHub ? 'Dispatch' : 'Origin', id: batteryId || firstLeg?.batteryId,
      model: battery?.model ?? (firstLegMatches ? firstLeg?.model : undefined), charge: battery?.chargeLevelPct ?? (firstLegMatches ? firstLeg?.charge : undefined)},
  ];
  if (drone.isCrossHub) {
    const outbound = legs.find(l => !l.isDispatch && l.fromId === order.originHubId);
    if (outbound?.batteryId && outbound.batteryId !== batteries[0].id) batteries.push({hub:originLabel,role:'Origin',id:outbound.batteryId,model:outbound.model,charge:outbound.charge});
  }
  relayHubIds.forEach((id,i) => {
    const plan = route.relayBatteryPlan?.find(p => p.hubId === id);
    const outbound = legs.find(l => l.fromId === id);
    const inbound = legs.find(l => l.toId === id);
    const changed = Boolean(inbound?.batteryId && outbound?.batteryId && inbound.batteryId !== outbound.batteryId);
    if (!swapHubIds.includes(id) && !plan?.swapBatteryId && !changed) return;
    batteries.push({hub:resolveHub(id),role:`Relay ${i+1}`,id:plan?.swapBatteryId ?? outbound?.batteryId,
      model:plan?.selectedBatteryModel ?? outbound?.model ?? plan?.batteryModel,
      charge:plan?.selectedBatteryChargePct ?? outbound?.charge});
  });
  // Older mapped routes expose altitude in the BE-supplied profile/route caption.
  const meta = `${route.speedProfileLabel ?? ''} ${route.routeString ?? ''} ${route.name}`;
  const altitude = meta.match(/\baltitude\s*[:=]?\s*(\d+(?:\.\d+)?)\s*m\b/i)?.[1];
  const speedText = meta.match(/(\d+(?:\.\d+)?)\s*km\s*\/\s*h\b/i)?.[1];
  const speed = route.aiExplanation?.flightSpeedKmh ?? (finite(route.flightSpeedMps) ? route.flightSpeedMps * 3.6 :
    finite(route.aiExplanation?.flightSpeedMps) ? route.aiExplanation.flightSpeedMps * 3.6 : speedText ? Number(speedText) : undefined);
  return { legs, path, batteries, altitude: altitude ? Number(altitude) : undefined, speed };
}

export function MissionReviewSummary(props: Props) {
  const { order, drone, route, timing, originLabel, swapHubIds, relayHubIds } = props;
  const { legs, path, batteries, speed, altitude } = buildReviewSummary(props);
  const received = Boolean(order.originPackageReceived || order.originHubReceivedAt);
  const modelNames = [...new Set(batteries.map(b => b.model).filter(Boolean))];
  const sharedModel = modelNames.length === 1 && batteries.every(b => b.model === modelNames[0]) ? modelNames[0] : undefined;
  const profile = route.displayTitle || route.speedProfileLabel?.split('(')[0].trim() || formatRouteName(route.name);
  return <div className="mission-review-summary">
    <Section title="Order information" icon={<Package size={16} />}>
      <dl className="mr-fields">
        <Field label="Order ID"><span className="mr-id">{order.id}</span></Field>
        <Field label="Delivery mode"><span className="mr-inline">{String(order.deliveryMode).toUpperCase() === 'EXPRESS' && <Zap size={15} className="mr-accent" />}{order.deliveryMode}</span></Field>
        <Field label="Payload">{finite(order.payloadKg) ? `${order.payloadKg.toFixed(2)} kg` : '—'}</Field>
        <Field label="Origin package">
          <span>
            {received ? 'Received at Hub' : 'Awaiting package'}
            {order.originHubReceivedAt && ` · ${formatMissionTime(order.originHubReceivedAt)}`}
          </span>
        </Field>
      </dl>
    </Section>
    <Section title="Flight parameters & schedule" icon={<Clock size={16} />}>
      <dl className="mr-fields mr-schedule">
        <Field label="Total distance">{measure(route.distanceKm,' km',2)}</Field>
        <Field label="Estimated duration">{measure(route.predictedDurationMin,' min')}</Field>
        <Field label="Flight speed">{measure(speed,' km/h')}</Field>
        <Field label="Flight altitude">{measure(altitude,' m')}</Field>
        <Field label="Planned start">{formatMissionTime(timing.plannedStartAt)}</Field>
        <Field label="Estimated arrival">{formatMissionTime(timing.estimatedArrivalAt)}</Field>
      </dl>
    </Section>
    <Section title="Flight route" icon={<Route size={16} />}>
      <div className="mr-body">
        <dl className="mr-single"><Field label="Route ID">{route.id}</Field></dl>
        <div className="mr-profile"><Leaf size={15} />{profile || '—'}</div>
        <div className="mr-divider" />
        <ol className="mr-path">
          {path.map((hub,i) => {
            const swap = hub.id != null && (swapHubIds.includes(hub.id) || (relayHubIds.includes(hub.id) && batteries.some(b => b.hub === hub.name && b.role.startsWith('Relay'))));
            const relayIndex = hub.id ? relayHubIds.indexOf(hub.id) : -1;
            const role = i === path.length-1 ? 'Destination' : hub.id === order.originHubId || (!drone.isCrossHub && i === 0) ? 'Origin' :
              i === 0 && drone.isCrossHub ? 'Dispatch origin' : `Relay ${relayIndex >= 0 ? relayIndex + 1 : i}${swap ? ' · Battery swap' : ''}`;
            return <li key={`${hub.id ?? hub.name}-${i}`}><span className="mr-path-dot" aria-hidden="true" /><div><strong>{hub.name}</strong><small>{role}</small></div></li>;
          })}
        </ol>
        {drone.isCrossHub && !legs.some(l => l.isDispatch) && <small>Dispatch to {originLabel} · leg data unavailable</small>}
      </div>
    </Section>
    <Section title="Assigned equipment" icon={<Cpu size={16} />}>
      <div className="mr-body">
        <small>Assigned drone</small>
        <div className="mr-drone"><span className="mr-drone-icon"><Icon name="drone" size={21} /></span><div><strong className="mr-id">{getDroneDisplayCode(drone)}</strong><small>{drone.model || '—'}</small></div></div>
        <div className="mr-divider" />
        <div className="mr-battery-title"><strong>Assigned batteries</strong><small>{batteries.filter(b=>b.id).length} {batteries.filter(b=>b.id).length === 1 ? 'battery' : 'batteries'}</small></div>
        <div className="mr-batteries">
          {batteries.map((b,i) => <div className="mr-battery" key={`${b.hub}-${i}`}>
            <div><strong>{b.hub}</strong><small>{b.role}</small></div>
            <div><span className="mr-id">{b.id || 'No battery allocated'}</span><span className="mr-inline mr-charge"><BatteryFull size={15} />{pct(b.charge)}</span></div>
            {!sharedModel && b.model && <small>{b.model}</small>}
          </div>)}
        </div>
        {sharedModel && <small>Battery model: {sharedModel}</small>}
      </div>
    </Section>
    <section className="mr-energy" aria-label="Energy prediction summary">
      <h3 className="mr-heading"><BarChart3 size={16} />Performance &amp; Energy</h3>
      <div className="mr-energy-metrics">
        <div><small>Total predicted energy</small><strong>{energy(route.predictedEnergyWh)}</strong></div>
        <div><small>Minimum battery reserve</small><strong>{DEFAULT_BATTERY_RESERVE_PCT}%</strong><small>For each leg</small></div>
      </div>
      <div className="mr-divider" />
      <h4>Energy consumption by leg</h4>
      <div className="mr-table-scroll"><table className="mr-table"><thead><tr><th scope="col">Flight leg</th><th scope="col">Distance</th><th scope="col">Energy</th><th scope="col">Battery consumption</th></tr></thead>
        <tbody>{legs.length ? legs.map((l,i) => <tr key={i}><td>{l.from} → {l.to}</td><td>{measure(l.distance,' km',2)}</td><td>{energy(l.energy)}</td><td className="mr-accent">{pct(l.use)}</td></tr>) : <tr><td colSpan={4}>Per-leg data unavailable</td></tr>}</tbody>
      </table></div>
    </section>
  </div>;
}
