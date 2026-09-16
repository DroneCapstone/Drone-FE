import { NavLink, useLocation } from 'react-router-dom';
import { operatorNavigation } from '../../../constants/operatorNavigation';
import { Icon } from '../../ui/Icon';

interface OperatorSidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onToggleCollapsed: () => void;
}

export function OperatorSidebar({ collapsed, mobileOpen, onCloseMobile, onToggleCollapsed }: OperatorSidebarProps) {
  const { pathname } = useLocation();
  return <>
    <aside className={`sidebar ${mobileOpen ? 'is-open' : ''}`}>
      <div className="brand-row">
        <NavLink to="/operator/dashboard" className="brand" aria-label="AeroOps dashboard"><span className="brand-mark"><Icon name="propeller" size={22}/></span><span className="brand-name">AERO<span>OPS</span></span></NavLink>
        <button className="icon-button sidebar-close" onClick={onCloseMobile} aria-label="Close navigation"><Icon name="close"/></button>
      </div>
      <div className="workspace-switcher"><span className="workspace-avatar">OP</span><span className="workspace-copy"><strong>Operator Console</strong><small>SGN Control Center</small></span></div>
      <nav className="side-nav" aria-label="Operator navigation">
        <span className="nav-caption">CONTROL</span>
        {operatorNavigation.map((item) => {
          const active = pathname === item.path || Boolean(item.children?.some((child) => pathname === child.path));
          return <div className={`nav-group ${active ? 'active' : ''}`} key={item.label}>
            <NavLink to={item.path} className="nav-main" onClick={onCloseMobile} title={collapsed ? item.label : undefined}><Icon name={item.icon} size={19}/><span>{item.label}</span>{item.children && <Icon name="chevron" size={14} className="nav-chevron"/>}</NavLink>
            {item.children && active && <div className="nav-children">{item.children.map((child) => <NavLink key={child.path} to={child.path} onClick={onCloseMobile}>{child.label}</NavLink>)}</div>}
          </div>;
        })}
      </nav>
      <div className="system-card"><div className="system-card-top"><span><i/> System status</span><strong>Nominal</strong></div><div className="system-meter"><span/></div><small>24 services online</small></div>
      <button className="collapse-button" onClick={onToggleCollapsed} aria-label="Toggle sidebar"><Icon name="collapse"/><span>Collapse sidebar</span></button>
    </aside>
    {mobileOpen && <button className="sidebar-backdrop" onClick={onCloseMobile} aria-label="Close navigation"/>}
  </>;
}
