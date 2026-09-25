import { NavLink, useNavigate } from 'react-router-dom';
import { HubCard } from '../../components/HubCard';
import { OperatorPanel } from '../../components/OperatorPanel';
import { operatorHubs } from '../../data/hubMockData';
import { getPickupState } from '../../utils/deliveryPlanning';
import { loadOperatorFleet } from '../../utils/operatorFleetStorage';
import { hasActiveMissionForDrone, loadOperatorMissions } from '../../utils/operatorMissionStorage';
import { loadOperatorOrders } from '../../utils/operatorOrderStorage';
import { FleetHubPageShell } from '../fleet/FleetHubPageShell';

export function HubNetworkPage() {
  const navigate = useNavigate();
  const fleet = loadOperatorFleet();
  const missions = loadOperatorMissions();
  const orders = loadOperatorOrders();

  const openHubDrones = (hubId: string) => {
    navigate(`/operator/fleet-hubs/drones?hub=${encodeURIComponent(hubId)}`);
  };

  return (
    <FleetHubPageShell active="/operator/fleet-hubs/hubs">
      <OperatorPanel
        title="Hub network"
        eyebrow="DRONE + PACKAGE HANDOFF OVERVIEW"
        action={
          <NavLink className="text-button" to="/operator/fleet-hubs/drones">
            View all drones
          </NavLink>
        }
      >
        <div className="hub-grid">
          {operatorHubs.map((hub) => {
            const hubDrones = fleet.filter((drone) => drone.hubId === hub.id);
            const readyDrones = hubDrones.filter(
              (drone) =>
                drone.technicalStatus === 'Available' &&
                !hasActiveMissionForDrone(drone.id, missions),
            );

            const hubPickupOrders = orders.filter(
              (order) =>
                order.destinationHubId === hub.id &&
                order.status === 'Ready for Pickup',
            );

            const contactRequired = hubPickupOrders.filter(
              (order) => getPickupState(order) === 'Contact Required',
            ).length;

            const disposalRequired = hubPickupOrders.filter(
              (order) => getPickupState(order) === 'Disposal Required',
            ).length;

            return (
              <HubCard
                key={hub.id}
                hub={hub}
                totalDrones={hubDrones.length}
                readyDrones={readyDrones.length}
                awaitingPickup={hubPickupOrders.length}
                contactRequired={contactRequired}
                disposalRequired={disposalRequired}
                onSelect={() => openHubDrones(hub.id)}
              />
            );
          })}
        </div>

        {/* <p className="section-note">
          Hubs are operational handoff points, not long-term warehouses. Customers drop off at the Origin Hub and collect at the Destination Hub. Standard parcels are held up to 2 days; food and beverages up to 3 hours.
        </p> */}
      </OperatorPanel>
    </FleetHubPageShell>
  );
}
