import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ActionButton } from '../../../components/ui/ActionButton';
import { Switch } from '../../../components/ui/Switch';
import { OperatorPanel } from '../components/OperatorPanel';
import { PageHeader } from '../components/PageHeader';
import { operatorHubs } from '../data/hubMockData';
import type { Tone } from '../types/operator';
import { formatDeliveryWindow, getOrderPlanningBadge, getPickupState, isActionablePlanningState } from '../utils/deliveryPlanning';
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
  const contactOrder = orders.find((order) => getPickupState(order) === 'Contact Required');
  const finalReminderOrder = orders.find((order) => getPickupState(order) === 'Final Reminder');
  const disposalOrder = orders.find((order) => getPickupState(order) === 'Disposal Required');
  const departureItem = missions
    .filter((mission) => mission.status === 'Scheduled')
    .map((mission) => ({
      mission,
      evaluation: getMissionPreflight(
        mission,
        orders.find((order) => order.id === mission.orderId),
        fleet.find((drone) => drone.id === mission.droneId),
        operatorHubs,
        missions,
      ),
    }))
    .find((item) => item.evaluation.state !== 'Scheduled');

  const initial = useMemo(() => {
    const values: Array<{ title: string; body: string; time: string; tone: Tone; category: string; read: boolean; target?: string }> = [];
    if (planningOrder) values.push({ title: `${planningOrder.id} is ready for Mission planning`, body: `Estimated delivery ${formatDeliveryWindow(planningOrder)}. Create the Mission now; no drone was held when the Order was placed.`, time: 'Now', tone: 'warning', category: 'Planning', read: false, target: `/operator/orders/${planningOrder.id}` });
    if (departureItem) values.push({ title: `${departureItem.mission.id} · ${departureItem.evaluation.state}`, body: departureItem.evaluation.state === 'Ready for Departure' ? 'Pre-flight checks passed. Operator Start Mission is required before the drone begins execution.' : 'One or more pre-flight checks failed. Review before departure.', time: 'Now', tone: departureItem.evaluation.state === 'Departure Hold' ? 'danger' : 'warning', category: 'Departure', read: false, target: `/operator/missions/${departureItem.mission.id}` });
    if (contactOrder) values.push({ title: `${contactOrder.id} customer contact required`, body: 'Expected pickup time passed. Contact the customer by Phone / SMS and record the result.', time: 'Now', tone: 'warning', category: 'Pickup', read: false, target: `/operator/orders/${contactOrder.id}` });
    if (finalReminderOrder) values.push({ title: `${finalReminderOrder.id} final pickup reminder`, body: 'The Hub holding deadline is approaching. Send the final customer reminder.', time: 'Now', tone: 'warning', category: 'Pickup', read: false, target: `/operator/orders/${finalReminderOrder.id}` });
    if (disposalOrder) values.push({ title: `${disposalOrder.id} disposal required`, body: 'The holding deadline expired. Package stays physically at the Hub until Hub staff / Technician confirms disposal.', time: 'Now', tone: 'danger', category: 'Pickup', read: false, target: `/operator/orders/${disposalOrder.id}` });
    values.push(
      { title: 'Mission incident requires monitoring', body: 'MSN-3110 is continuing with a replacement drone after a serious alert was escalated to a Technical Incident.', time: '2 min ago', tone: 'warning', category: 'Operational', read: false, target: '/operator/missions/MSN-3110' },
      { title: 'Telemetry log validated', body: 'Flight log FLT-9179 passed all quality checks.', time: '1 hour ago', tone: 'success', category: 'System', read: true },
    );
    return values;
  }, [contactOrder, departureItem, disposalOrder, finalReminderOrder, planningOrder]);

  const [items, setItems] = useState(initial);
  const [filter, setFilter] = useState('All');
  const visibleItems = filter === 'All' ? items : items.filter((item) => item.category === filter);

  return (
    <>
      <PageHeader section="notifications" action={<ActionButton variant="secondary" onClick={() => setItems(items.map((item) => ({ ...item, read: true })))}>Mark all as read</ActionButton>} />
      <div className="notification-layout">
        <OperatorPanel className="flush-panel">
          <div className="notification-filter">
            {['All', 'Planning', 'Departure', 'Pickup', 'Operational', 'System'].map((item) => (
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
          <div className="toggle-row"><span><strong>Planning updates</strong><small>Ready-for-planning and overdue Order reminders</small></span><Switch aria-label="Planning updates" defaultChecked /></div>
          <div className="toggle-row"><span><strong>Departure checks</strong><small>Ready-for-departure and departure-hold reminders</small></span><Switch aria-label="Departure checks" defaultChecked /></div>
          <div className="toggle-row"><span><strong>Pickup exceptions</strong><small>Customer contact, final reminder, and disposal-required alerts</small></span><Switch aria-label="Pickup exceptions" defaultChecked /></div>
        </OperatorPanel>
      </div>
    </>
  );
}
