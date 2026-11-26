import { UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { HubDetailApi } from '../api/adminOperationsApi';

export function AdminHubTechnicians({ hub }: { hub: HubDetailApi }) {
  const technicians = hub.assigned_technicians ?? (hub.assigned_technician ? [hub.assigned_technician] : []);
  const known = Array.isArray(hub.assigned_technicians) || 'assigned_technician' in hub;
  return <section className="admin-hub-section" aria-labelledby="hub-technicians">
    <div className="admin-hub-assets-header"><h2 id="hub-technicians" className="admin-hub-section-title"><UsersRound size={17} />Assigned technicians{known ? ` (${technicians.length})` : ''}</h2></div>
    <div className="admin-hub-assets-table-wrap"><table className="admin-hub-assets-table"><thead><tr><th>Technician</th><th>Email</th><th>Action</th></tr></thead><tbody>
      {technicians.map(person => <tr key={person.id}><td><strong>{person.full_name}</strong></td><td>{person.email}</td><td><Link className="text-button" to={`/admin/users/${encodeURIComponent(person.id)}`}>View</Link></td></tr>)}
      {!technicians.length && <tr><td colSpan={3} className="py-6 text-center">{known ? 'No technicians assigned.' : 'Technician assignments unavailable.'}</td></tr>}
    </tbody></table></div>
  </section>;
}
