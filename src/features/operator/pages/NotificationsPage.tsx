import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ActionButton } from '../../../components/ui/ActionButton';
import { Switch } from '../../../components/ui/Switch';
import { OperatorPanel } from '../components/OperatorPanel';
import { PageHeader } from '../components/PageHeader';
import { useFleetDronesQuery } from '../hooks/useFleetQueries';
import { useMissionListQuery } from '../hooks/useMissionQueries';
import { useOperatorOrdersQuery } from '../hooks/useOrderQueries';
import type { Tone } from '../types/operator';
import { formatDeliveryWindow, getOrderPlanningBadge, canCreateMissionForOrder } from '../utils/deliveryPlanning';
import { getMissionPreflight } from '../utils/missionPreflight';

export function NotificationsPage() {
  const navigate = useNavigate();
  const { data: orders = [] } = useOperatorOrdersQuery();
  const { data: missions = [] } = useMissionListQuery();
  const { data: fleet = [] } = useFleetDronesQuery();

  const planningOrder = orders.find((order) => canCreateMissionForOrder(order, missions));
  const replanOrder = orders.find((order) => getOrderPlanningBadge(order, missions) === 'Needs Replanning');
  const departureItem = useMemo(
    () => missions
      .filter((mission) => mission.status === 'Scheduled')
      .map((mission) => ({
        mission,
        evaluation: getMissionPreflight(
          mission,
          orders.find((order) => order.id === mission.orderId),
          fleet.find((drone) => drone.id === mission.droneId),
          missions,
        ),
      }))
      .find((item) => item.evaluation.state !== 'Scheduled'),
    [fleet, missions, orders],
  );

  const initial = useMemo(() => {
    const values: Array<{ title: string; body: string; time: string; tone: Tone; category: string; read: boolean; target?: string }> = [];
    if (planningOrder) values.push({ title: `${planningOrder.id} is ready for Mission planning`, body: `Estimated delivery ${formatDeliveryWindow(planningOrder)}. Package has been received. You can create the Mission now.`, time: 'Now', tone: 'warning', category: 'Planning', read: false, target: `/operator/orders/${planningOrder.id}` });
    if (replanOrder) values.push({ title: `${replanOrder.id} needs replanning`, body: 'This Order requires replanning. Continue when the order is eligible.', time: 'Now', tone: 'danger', category: 'Planning', read: false, target: `/operator/orders/${replanOrder.id}` });
    if (departureItem) values.push({ title: `${departureItem.mission.id} · ${departureItem.evaluation.state}`, body: departureItem.evaluation.state === 'Ready for Departure' ? 'Preflight checks passed. Departure will begin automatically at the permitted time.' : 'One or more Final Validation conditions are not ready. The Mission remains Scheduled.', time: 'Now', tone: departureItem.evaluation.state === 'Departure Hold' ? 'danger' : 'warning', category: 'Departure', read: false, target: `/operator/missions/${departureItem.mission.id}` });
    return values;
  }, [departureItem, planningOrder, replanOrder]);

  const [items, setItems] = useState(initial);

  useEffect(() => {
    setItems((current) =>
      initial.map((next) => ({
        ...next,
        read: current.find((item) => item.title === next.title)?.read ?? next.read,
      })),
    );
  }, [initial]);

  const [filter, setFilter] = useState('All');
  const visibleItems = filter === 'All' ? items : items.filter((item) => item.category === filter);

  return (
    <>
      <PageHeader section="notifications" action={<ActionButton variant="secondary" onClick={() => setItems(items.map((item) => ({ ...item, read: true })))}>Mark all as read</ActionButton>} />
      <div className="notification-layout">
        <OperatorPanel className="flush-panel">
          <div className="notification-filter">
            {['All', 'Planning', 'Departure', 'Operational', 'System'].map((item) => (
              <button type="button" className={filter === item ? 'active' : ''} onClick={() => setFilter(item)} key={item}>{item}{item === 'All' && <span>{items.length}</span>}</button>
            ))}
          </div>
          <div className="notification-list">
            {visibleItems.map((item) => {
              const index = items.indexOf(item);
              return (
                <button
                  type="button"
                  className={`${!item.read ? 'unread' : ''} tone-${item.tone}`}
                  key={`${item.category}-${item.title}`}
                  onClick={() => {
                    setItems(items.map((entry, itemIndex) => itemIndex === index ? { ...entry, read: true } : entry));
                    if (item.target) navigate(item.target);
                  }}
                >
                  <span><strong>{item.title}</strong><p>{item.body}</p><small>{item.category} · {item.time}</small></span>
                  {!item.read && <i />}
                </button>
              );
            })}
          </div>
        </OperatorPanel>

        <OperatorPanel title="Notification settings">
          <div className="toggle-row"><span><strong>Critical alerts</strong><small>Airspace, energy, safety, and technical events</small></span><Switch aria-label="Critical alerts" defaultChecked /></div>
          <div className="toggle-row"><span><strong>Planning updates</strong><small>Ready-for-planning and replanning reminders</small></span><Switch aria-label="Planning updates" defaultChecked /></div>
          <div className="toggle-row"><span><strong>Departure checks</strong><small>Final Validation readiness and departure-hold reminders</small></span><Switch aria-label="Departure checks" defaultChecked /></div>
        </OperatorPanel>
      </div>
    </>
  );
}
