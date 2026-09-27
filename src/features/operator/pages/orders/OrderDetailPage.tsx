import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ActionButton } from '../../../../components/ui/ActionButton';
import { DropdownSelect } from '../../../../components/ui/DropdownSelect';
import { StatusBadge } from '../../../../components/ui/StatusBadge';
import { OperatorPanel } from '../../components/OperatorPanel';
import { operatorHubs } from '../../data/hubMockData';
import type { CustomerContactChannel, CustomerContactResult, Tone } from '../../types/operator';
import {
  formatDeliveryWindow,
  getDeliveryMission,
  getOrderPlanningBadge,
  getPickupState,
  isActionablePlanningState,
} from '../../utils/deliveryPlanning';
import { formatMissionTime } from '../../utils/missionTiming';
import { loadOperatorMissions } from '../../utils/operatorMissionStorage';
import { addCustomerContact, getOperatorOrder } from '../../utils/operatorOrderStorage';
import { isFoodOrBeverage } from '../../utils/pickupPolicy';
import { OrderPageShell } from './OrderPageShell';

function money(value = 0) {
  return new Intl.NumberFormat('vi-VN').format(value) + ' ₫';
}

function hubName(hubId: string) {
  return operatorHubs.find((hub) => hub.id === hubId)?.name ?? hubId;
}

function orderTone(status: string): Tone {
  if (status === 'Completed') return 'success';
  if (status === 'Cancelled' || status === 'Disposed') return 'danger';
  if (status === 'Ready for Pickup') return 'warning';
  return 'info';
}

export function OrderDetailPage() {
  const { orderId = '' } = useParams();
  const navigate = useNavigate();
  const initialOrder = useMemo(() => getOperatorOrder(orderId), [orderId]);
  const missions = useMemo(() => loadOperatorMissions(), []);
  const [order, setOrder] = useState(initialOrder);
  const [contactOpen, setContactOpen] = useState(false);
  const [channel, setChannel] = useState<CustomerContactChannel>('Phone');
  const [result, setResult] = useState<CustomerContactResult>('No Answer');
  const [note, setNote] = useState('');

  if (!order) {
    return <OrderPageShell active="/operator/orders/all"><OperatorPanel><div className="operator-empty-state">Order not found.</div></OperatorPanel></OrderPageShell>;
  }

  const deliveryMission = getDeliveryMission(order.id, missions);
  const planning = getOrderPlanningBadge(order, missions);
  const pickupState = getPickupState(order);
  const actionable = isActionablePlanningState(planning);
  const perishable = isFoodOrBeverage(order.packageType);

  const handleSaveContact = () => {
    const updated = addCustomerContact(order.id, channel, result, note);
    if (updated) {
      setOrder(updated);
      setNote('');
      setContactOpen(false);
    }
  };

  return (
    <OrderPageShell active="/operator/orders/all">
      <div className="detail-layout">
        <div className="detail-main">
          <OperatorPanel>
            <div className="mission-hero">
              <div>
                <StatusBadge tone={orderTone(order.status)}>{order.status}</StatusBadge>
                <h2>{order.id}</h2>
                <p>{order.customerName} · {order.packageLabel} · {order.deliveryMode}</p>
              </div>
              <div className="mission-hero-actions">
                {deliveryMission && <ActionButton onClick={() => navigate(`/operator/missions/${deliveryMission.id}`)}>View delivery mission</ActionButton>}
                {!deliveryMission && order.status === 'Pending' && <ActionButton disabled={!actionable} onClick={() => navigate(`/operator/missions/create?orderId=${order.id}`)}>Create mission</ActionButton>}
              </div>
            </div>
          </OperatorPanel>

          <OperatorPanel title="Delivery request" eyebrow="CUSTOMER ORDER">
            <dl className="review-values">
              <div><dt>Delivery mode</dt><dd>{order.deliveryMode}</dd></div>
              <div><dt>Origin Hub</dt><dd>{hubName(order.originHubId)}</dd></div>
              <div><dt>Destination Hub</dt><dd>{hubName(order.destinationHubId)}</dd></div>
              <div><dt>Package received at Origin Hub</dt><dd>{order.originHubReceivedAt ? formatMissionTime(order.originHubReceivedAt) : 'Awaiting customer drop-off'}</dd></div>
              <div><dt>Package</dt><dd>{order.packageLabel}</dd></div>
              <div><dt>Package type</dt><dd>{order.packageType}</dd></div>
              <div><dt>Payload</dt><dd>{order.payloadKg} kg</dd></div>
              <div><dt>Estimated delivery</dt><dd>{formatDeliveryWindow(order)}</dd></div>
              <div><dt>Planning opens</dt><dd>{formatMissionTime(order.planningAt)}</dd></div>
              <div><dt>Planning state</dt><dd>{planning ?? (deliveryMission ? 'Mission already created' : 'Closed')}</dd></div>
            </dl>
          </OperatorPanel>

          <OperatorPanel title="Flight Mission" eyebrow="ORDER → DELIVERY MISSION">
            {!deliveryMission ? (
              <div className="linked-record">
                <div>
                  <strong>{planning ?? 'No Mission required'}</strong>
                  <small>
                    {planning === 'Awaiting Package'
                      ? 'Planning time is open, but Technician / Hub staff must confirm physical package receipt first.'
                      : actionable
                        ? 'Planning is open for this Order.'
                        : 'The system will surface this Order when planning opens.'}
                  </small>
                </div>
                {planning && <StatusBadge tone={planning === 'Planning Overdue' ? 'danger' : planning === 'Ready for Planning' ? 'warning' : 'neutral'}>{planning}</StatusBadge>}
                {actionable && <button className="row-action" type="button" onClick={() => navigate(`/operator/missions/create?orderId=${order.id}`)}>Create mission</button>}
              </div>
            ) : (
              <div className="linked-mission-list">
                <button type="button" onClick={() => navigate(`/operator/missions/${deliveryMission.id}`)}>
                  <span><small>DELIVERY</small><strong>{deliveryMission.id}</strong><em>{deliveryMission.drone} · {deliveryMission.route}</em></span>
                  <StatusBadge tone={deliveryMission.tone}>{deliveryMission.status}</StatusBadge>
                </button>
              </div>
            )}
          </OperatorPanel>

          {(order.status === 'Ready for Pickup' || order.status === 'Disposed') && (
            <OperatorPanel title="Customer pickup" eyebrow="DESTINATION HUB HANDOFF">
              <dl className="review-values">
                <div><dt>Destination Hub</dt><dd>{hubName(order.destinationHubId)}</dd></div>
                <div><dt>Pickup state</dt><dd>{order.status === 'Disposed' ? 'Closed · Disposed' : pickupState ?? 'Waiting'}</dd></div>
                <div><dt>Ready for pickup</dt><dd>{order.readyForPickupAt ? formatMissionTime(order.readyForPickupAt) : '—'}</dd></div>
                <div><dt>Expected pickup</dt><dd>{order.expectedPickupAt ? formatMissionTime(order.expectedPickupAt) : '—'}</dd></div>
                <div><dt>Holding deadline</dt><dd>{order.pickupDeadline ? formatMissionTime(order.pickupDeadline) : '—'}</dd></div>
                <div><dt>Holding policy</dt><dd>{perishable ? 'Food / Beverage · up to 3 hours' : 'Standard parcel · up to 2 days'}</dd></div>
                <div><dt>Package disposition</dt><dd>{order.packageDisposition ?? 'Temporarily held at Destination Hub'}</dd></div>
                <div><dt>Disposed at</dt><dd>{order.disposedAt ? formatMissionTime(order.disposedAt) : '—'}</dd></div>
              </dl>
              <div className="notification-policy-note">
                <strong>Pickup exception policy</strong>
                <span>System notifies the customer when the package is ready. If the expected pickup time passes, Operator follows up by phone / SMS and records the result. Once the holding deadline expires, the package becomes Disposal Required; physical disposal must be confirmed by Hub staff / Technician before the Order becomes Disposed.</span>
              </div>
            </OperatorPanel>
          )}

          {order.status === 'Ready for Pickup' && (
            <OperatorPanel title="Customer contact history" eyebrow="PICKUP FOLLOW-UP">
              {(order.contactHistory ?? []).length === 0 ? (
                <div className="operator-empty-state">No manual contact attempts have been recorded.</div>
              ) : (
                <div className="contact-history-list">
                  {(order.contactHistory ?? []).slice().reverse().map((entry) => (
                    <div key={entry.id}>
                      <span><strong>{entry.channel} · {entry.result}</strong><small>{formatMissionTime(entry.contactedAt)}</small></span>
                      {entry.note && <p>{entry.note}</p>}
                    </div>
                  ))}
                </div>
              )}

              {contactOpen && (
                <div className="contact-customer-form">
                  <div className="contact-customer-fields">
                    <label>
                      <span>Channel</span>
                      <DropdownSelect value={channel} options={['Phone', 'SMS']} onChange={(value) => setChannel(value as CustomerContactChannel)} ariaLabel="Contact channel" />
                    </label>
                    <label>
                      <span>Result</span>
                      <DropdownSelect value={result} options={['Reached', 'No Answer', 'Will Pick Up', 'Sent', 'Failed']} onChange={(value) => setResult(value as CustomerContactResult)} ariaLabel="Contact result" />
                    </label>
                  </div>
                  <label className="contact-note-field">
                    <span>Note</span>
                    <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Example: Customer confirmed pickup before 18:00" rows={3} />
                  </label>
                  <div className="form-actions">
                    <ActionButton variant="secondary" onClick={() => setContactOpen(false)}>Cancel</ActionButton>
                    <ActionButton onClick={handleSaveContact}>Save contact</ActionButton>
                  </div>
                </div>
              )}
            </OperatorPanel>
          )}
        </div>

        <aside className="detail-side">
          <OperatorPanel title="Customer">
            <dl className="key-values">
              <div><dt>Name</dt><dd>{order.customerName}</dd></div>
              <div><dt>Phone</dt><dd>{order.customerPhone}</dd></div>
              <div><dt>Requested date</dt><dd>{order.requestedDate}</dd></div>
              <div><dt>Delivery mode</dt><dd>{order.deliveryMode}</dd></div>
            </dl>
            {order.status === 'Ready for Pickup' && (pickupState === 'Contact Required' || pickupState === 'Final Reminder') && (
              <ActionButton variant="secondary" style={{ width: '100%', marginTop: 12 }} onClick={() => setContactOpen(true)}>
                Contact customer
              </ActionButton>
            )}
            {pickupState === 'Disposal Required' && (
              <div className="pickup-exception-callout danger">
                <strong>Disposal required</strong>
                <span>The holding deadline has expired. Package remains physically at the Hub until Hub staff / Technician confirms disposal.</span>
              </div>
            )}
          </OperatorPanel>

          {order.charges && (
            <OperatorPanel title="Charges">
              <dl className="key-values">
                <div><dt>Delivery fee</dt><dd>{money(order.charges.deliveryFee)}</dd></div>
                <div><dt>Penalty fee</dt><dd>{order.charges.penaltyFee ? money(order.charges.penaltyFee) : '—'}</dd></div>
                <div><dt>Refund</dt><dd>{order.charges.refundAmount ? money(order.charges.refundAmount) : '—'}</dd></div>
              </dl>
            </OperatorPanel>
          )}
        </aside>
      </div>
    </OrderPageShell>
  );
}
