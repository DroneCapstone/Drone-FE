import { OperatorTable, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../operator/components/OperatorTable";
import { UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { HubDetailApi } from '../api/adminOperationsApi';

export function AdminHubTechnicians({ hub }: { hub: HubDetailApi }) {
  const technicians = hub.assigned_technicians ?? (hub.assigned_technician ? [hub.assigned_technician] : []);
  const known = Array.isArray(hub.assigned_technicians) || 'assigned_technician' in hub;
  return <section className="admin-hub-section" aria-labelledby="hub-technicians">
    <div className="admin-hub-assets-header"><h2 id="hub-technicians" className="admin-hub-section-title"><UsersRound size={17} />Assigned technicians{known ? ` (${technicians.length})` : ''}</h2></div>
    <div className="admin-hub-assets-table-wrap"><OperatorTable className="admin-hub-assets-table admin-pinned-actions"><TableHeader><TableRow><TableHead>Technician</TableHead><TableHead>Email</TableHead><TableHead>Action</TableHead></TableRow></TableHeader><TableBody>
      {technicians.map(person => <TableRow key={person.id}><TableCell><strong>{person.full_name}</strong></TableCell><TableCell>{person.email}</TableCell><TableCell><Link className="text-button" to={`/admin/users/${encodeURIComponent(person.id)}`}>View</Link></TableCell></TableRow>)}
      {!technicians.length && <TableRow><TableCell colSpan={3} className="py-6 text-center">{known ? 'No technicians assigned.' : 'Technician assignments unavailable.'}</TableCell></TableRow>}
    </TableBody></OperatorTable></div>
  </section>;
}
