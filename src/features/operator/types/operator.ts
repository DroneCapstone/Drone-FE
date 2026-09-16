export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface Mission {
  id: string;
  name: string;
  drone: string;
  route: string;
  status: string;
  tone: Tone;
  eta: string;
  battery: number;
}

export interface OperatorNavItem {
  label: string;
  path: string;
  icon: import('../../../components/ui/Icon').IconName;
  children?: Array<{ label: string; path: string }>;
}
