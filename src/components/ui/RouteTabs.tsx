import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function RouteTabs({ items, active }: { items: Array<{ label: string; path: string }>; active: string }) {
  return <nav className="subtabs" aria-label="Section navigation">{items.map((item) => <NavLink aria-current={active === item.path ? 'page' : undefined} className={cn(active === item.path && 'active')} to={item.path} key={item.path}>{item.label}</NavLink>)}</nav>;
}
