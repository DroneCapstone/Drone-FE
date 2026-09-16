import { NavLink } from 'react-router-dom';
import { Icon } from '../../ui/Icon';

interface OperatorHeaderProps {
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenMobile: () => void;
  onOpenSearch: () => void;
}

export function OperatorHeader({ isDark, onToggleTheme, onOpenMobile, onOpenSearch }: OperatorHeaderProps) {
  return <header className="topbar">
    <button className="icon-button mobile-menu" onClick={onOpenMobile} aria-label="Open navigation"><Icon name="menu"/></button>
    <button className="search-trigger" onClick={onOpenSearch}><Icon name="search" size={18}/><span>Search mission, drone, or command</span><kbd>⌘ K</kbd></button>
    <div className="topbar-actions">
      <span className="connection-pill"><i/> Live sync</span>
      <button className="icon-button" onClick={onToggleTheme} aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}><Icon name={isDark ? 'sun' : 'moon'}/></button>
      <NavLink className="icon-button notification-button" to="/operator/notifications" aria-label="Notifications"><Icon name="bell"/><span>3</span></NavLink>
      <NavLink className="profile-chip" to="/operator/profile"><span className="avatar">AK</span><span><strong>Alex Kim</strong><small>Lead operator</small></span></NavLink>
    </div>
  </header>;
}
