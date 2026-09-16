import { useState } from 'react';
import { DropdownSelect } from '../../../../components/ui/DropdownSelect';
import { Icon } from '../../../../components/ui/Icon';
import { MissionTable } from '../../components/MissionTable';
import { OperatorPanel } from '../../components/OperatorPanel';
import { missions } from '../../data/mockOperatorData';
import { MissionPageShell } from './MissionPageShell';

export function AllMissionsPage() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All status');
  const filtered = missions.filter((mission) => {
    const matchesQuery = `${mission.name} ${mission.id} ${mission.drone} ${mission.route}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (status === 'All status' || mission.status === status);
  });

  return <MissionPageShell active="/operator/missions/all"><OperatorPanel className="flush-panel"><div className="toolbar"><div className="filter-search"><Icon name="search"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search missions…"/></div><DropdownSelect value={status} options={['All status','In flight','Scheduled','Completed','Delayed','Review']} onChange={setStatus} ariaLabel="Mission status"/><span className="toolbar-spacer"/><small>{filtered.length} missions</small></div><MissionTable items={filtered}/></OperatorPanel></MissionPageShell>;
}
