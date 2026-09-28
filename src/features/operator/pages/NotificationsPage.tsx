import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ActionButton } from '../../../components/ui/ActionButton';
import { Switch } from '../../../components/ui/Switch';
import { OperatorPanel } from '../components/OperatorPanel';
import { PageHeader } from '../components/PageHeader';
import type { Tone } from '../types/operator';
import { formatDeliveryWindow, getOrderPlanningBadge, isActionablePlanningState } from '../utils/deliveryPlanning';
import { getMissionPreflight } from '../utils/missionPreflight';
import { loadOperatorFleet } from '../utils/operatorFleetStorage';
import { loadOperatorMissions } from '../utils/operatorMissionStorage';
import { loadOperatorOrders } from '../utils/operatorOrderStorage';

export function NotificationsPage() {
  const navigate = useNavigate();
  const orders = useMemo(() => loadOperatorOrders(), []);
  const missions = useMemo(() => loadOperatorMissions(), []);
  const fleet = useMemo(() => loadOperatorFleet(), []);

  const planningOrder = orders.find((order) => isActionablePlanningState(getOrderPlanningBadge(order, missions)));
  const replanOrder = orders.find((order) => getOrderPlanningBadge(order, missions) === 'Needs Replanning');
  const departureItem = missions
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
    .find((item) => item.evaluation.state !== 'Scheduled');

  const initial = useMemo(() => {
    const values: Array<{ title: string; body: string; time: string; tone: Tone; category: string; read: boolean; target?: string }> = [];
    if (planningOrder) values.push({ title: `${planningOrder.id} is ready for Mission planning`, body: `Estimated delivery ${formatDeliveryWindow(planningOrder)}. Create the Mission now; package receipt will be checked later in Final Validation.`, time: 'Now', tone: 'warning', category: 'Planning', read: false, target: `/operator/orders/${planningOrder.id}` });
    if (replanOrder) values.push({ title: `${replanOrder.id} needs replanning`, body: 'The previous Mission was cancelled before delivery. A new customer/system delivery window is required before another Mission is created.', time: 'Now', tone: 'danger', category: 'Planning', read: false, target: `/operator/orders/${replanOrder.id}` });
    if (departureItem) values.push({ title: `${departureItem.mission.id} · ${departureItem.evaluation.state}`, body: departureItem.evaluation.state === 'Ready for Departure' ? 'Final Validation passed. Start Mission is available in the departure window.' : 'One or more Final Validation conditions are not ready. The Mission remains Scheduled.', time: 'Now', tone: departureItem.evaluation.state === 'Departure Hold' ? 'danger' : 'warning', category: 'Departure', read: false, target: `/operator/missions/${departureItem.mission.id}` });
    values.push(
      { title: 'Mission incident requires monitoring', body: 'MSN-3110 is continuing with a replacement drone after a serious alert was escalated to a Technical Incident.', time: '2 min ago', tone: 'warning', category: 'Operational', read: false, target: '/operator/missions/MSN-3110' },
      { title: 'Telemetry log validated', body: 'Flight log FLT-9179 passed all quality checks.', time: '1 hour ago', tone: 'success', category: 'System', read: true },
    );
    return values;
  }, [departureItem, planningOrder, replanOrder]);

  const [items, setItems] = useState(initial);
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
