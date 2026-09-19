// import { Icon } from '../../../../components/ui/Icon';
// import { StatusBadge } from '../../../../components/ui/StatusBadge';
// import { OperatorPanel } from '../../components/OperatorPanel';
// import { missions } from '../../data/mockOperatorData';
// import { OperationPageShell } from './OperationPageShell';

// export function LiveTrackingPage() {
//   return <OperationPageShell active="/operator/operations/live">
//     <div className="live-layout"><OperatorPanel className="live-map-panel">
//       <div className="map-toolbar"><div><StatusBadge tone="success">8 ACTIVE</StatusBadge>
//         <span>Updated just now</span>
//       </div><div>
//           <button><Icon name="plus" /></button>
//           <button>−</button><button><Icon name="pin" /></button>
//         </div></div>
//       <div className="live-map">
//         <div className="map-grid" />
//         <div className="map-ring ring-a" />
//         <div className="map-ring ring-b" />
//         <div className="route-line live-a" />
//         <div className="route-line live-b" />
//         <span className="map-zone zone-live-a">CONTROL A</span>
//         <span className="map-zone zone-live-b">CONTROL B</span>
//         {['AX-17', 'NX-08', 'AX-04', 'CX-11', 'MX-22'].map((id, index) =>
//           <span className={`drone-pin live-pin pin-${index + 1}`} key={id}><Icon name="drone" size={18} />
//             <b>{id}</b></span>)}<div className="map-legend">
//           <span><i className="green" />Nominal</span>
//           <span><i className="orange" />Attention</span>
//           <span><i className="red" />Critical</span>
//         </div></div></OperatorPanel><aside className="flight-rail">
//         <div className="rail-head"><strong>Active flights</strong>
//           <button><Icon name="filter" /></button>
//         </div>{missions.slice(0, 4).map((mission, index) =>
//           <button className={`flight-card ${index === 0 ? 'active' : ''}`} key={mission.id}>
//             <span className="flight-icon"><Icon name="drone" />
//             </span><span><strong>{mission.drone}</strong>
//               <small>{mission.name}</small><em>{mission.route}</em></span>
//             <span><StatusBadge tone={mission.tone}>{mission.battery}%</StatusBadge><small>{mission.eta}</small></span>
//           </button>)}</aside></div></OperationPageShell>;
// }

import { useState } from 'react';

import { Icon } from '../../../../components/ui/Icon';
import { StatusBadge } from '../../../../components/ui/StatusBadge';

import { OperatorPanel } from '../../components/OperatorPanel';
import { missions } from '../../data/mockOperatorData';

import { OperationPageShell } from './OperationPageShell';

export function LiveTrackingPage() {
  const [selectedMissionId, setSelectedMissionId] = useState(
    missions[0]?.id ?? '',
  );

  return (
    <OperationPageShell active="/operator/operations/live">
      <div className="live-layout">
        {/* =========================
            LIVE MAP
        ========================= */}

        <OperatorPanel className="live-map-panel">
          <div className="map-toolbar">
            <div>
              <StatusBadge tone="success">8 ACTIVE</StatusBadge>
              <span>Updated just now</span>
            </div>

            <div>
              <button type="button">
                <Icon name="plus" />
              </button>

              <button type="button">−</button>

              <button type="button">
                <Icon name="pin" />
              </button>
            </div>
          </div>

          <div className="live-map">
            <div className="map-grid" />

            <div className="map-ring ring-a" />
            <div className="map-ring ring-b" />

            <div className="route-line live-a" />
            <div className="route-line live-b" />

            <span className="map-zone zone-live-a">CONTROL A</span>
            <span className="map-zone zone-live-b">CONTROL B</span>

            {['AX-17', 'NX-08', 'AX-04', 'CX-11', 'MX-22'].map(
              (id, index) => (
                <span
                  className={`drone-pin live-pin pin-${index + 1}`}
                  key={id}
                >
                  <Icon name="drone" size={18} />
                  <b>{id}</b>
                </span>
              ),
            )}

            <div className="map-legend">
              <span>
                <i className="green" />
                Nominal
              </span>

              <span>
                <i className="orange" />
                Attention
              </span>

              <span>
                <i className="red" />
                Critical
              </span>
            </div>
          </div>
        </OperatorPanel>

        {/* =========================
            ACTIVE FLIGHTS
        ========================= */}

        <aside className="flight-rail">
          <div className="rail-head">
            <strong>Active flights</strong>

            <button type="button">
              <Icon name="filter" />
            </button>
          </div>

          {missions.slice(0, 4).map((mission) => {
            const isSelected = selectedMissionId === mission.id;

            return (
              <button
                key={mission.id}
                type="button"
                className={`flight-card selectable-card ${isSelected ? 'active' : ''
                  }`}
                onClick={() => setSelectedMissionId(mission.id)}
              >
                <span className="flight-icon">
                  <Icon name="drone" />
                </span>

                <span>
                  <strong>{mission.drone}</strong>
                  <small>{mission.name}</small>
                  <em>{mission.route}</em>
                </span>

                <span>
                  <StatusBadge tone={mission.tone}>
                    {mission.battery}%
                  </StatusBadge>

                  <small>{mission.eta}</small>
                </span>
              </button>
            );
          })}
        </aside>
      </div>
    </OperationPageShell>
  );
}