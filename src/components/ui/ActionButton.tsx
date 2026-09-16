import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

interface ActionButtonProps {
  children: ReactNode;
  icon?: IconName;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  onClick?: () => void;
  type?: 'button' | 'submit';
}

export function ActionButton({ children, icon, variant = 'primary', onClick, type = 'button' }: ActionButtonProps) {
  return <button type={type} className={`button button-${variant}`} onClick={onClick}>{icon && <Icon name={icon} size={17} />}{children}</button>;
}
