import { useMemo, useState } from 'react';
import { DropdownSelect } from '../../../../components/ui/DropdownSelect';
import { Icon } from '../../../../components/ui/Icon';
import { MissionTable } from '../../components/MissionTable';
import { OperatorPanel } from '../../components/OperatorPanel';
import { OPERATOR_PAGE_SIZE, OperatorPagination } from '../../components/OperatorPagination';
import { loadOperatorMissions } from '../../utils/operatorMissionStorage';
import { MissionPageShell } from './MissionPageShell';

export function AllMissionsPage() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All statuses');
  const [page, setPage] = useState(1);
  const missions = useMemo(() => loadOperatorMissions(), []);

  const filtered = missions.filter((mission) => {
    const matchesQuery = `${mission.name} ${mission.id} ${mission.orderId} ${mission.drone} ${mission.route}`
      .toLowerCase()
      .includes(query.toLowerCase());
    return matchesQuery && (status === 'All statuses' || mission.status === status);
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / OPERATOR_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedMissions = filtered.slice(
    (currentPage - 1) * OPERATOR_PAGE_SIZE,
    currentPage * OPERATOR_PAGE_SIZE,
  );

  return (
    <MissionPageShell active="/operator/missions/all">
      <OperatorPanel className="flush-panel">
        <div className="toolbar">
          <div className="filter-search">
            <Icon name="search" />
            <input
              value={query}
              onChange={(event) => { setQuery(event.target.value); setPage(1); }}
              placeholder="Search flight missions…"
            />
          </div>
          <DropdownSelect
            value={status}
            options={['All statuses', 'Scheduled', 'In Progress', 'Completed', 'Cancelled', 'Failed']}
            onChange={(value) => { setStatus(value); setPage(1); }}
            ariaLabel="Mission status"
          />
          <span className="toolbar-spacer" />
          <small>{filtered.length} flight missions</small>
        </div>
        <MissionTable items={paginatedMissions} />
        <OperatorPagination
          currentPage={currentPage}
          totalItems={filtered.length}
          itemLabel="flight missions"
          onPageChange={setPage}
        />
      </OperatorPanel>
    </MissionPageShell>
  );
}
