import { NavLink } from 'react-router-dom';

export function RouteTabs({ items, active }: { items: Array<{ label: string; path: string }>; active: string }) {
  return <div className="subtabs" role="tablist">{items.map((item) => <NavLink role="tab" aria-selected={active === item.path} className={active === item.path ? 'active' : ''} to={item.path} key={item.path}>{item.label}</NavLink>)}</div>;
}
