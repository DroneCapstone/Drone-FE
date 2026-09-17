import type { ReactNode, SVGProps } from 'react';

export type IconName = 'grid' | 'mission' | 'radar' | 'spark' | 'chart' | 'file' | 'bell' | 'user' | 'propeller' | 'chevron' | 'close' | 'collapse' | 'menu' | 'search' | 'sun' | 'moon' | 'arrow' | 'plus' | 'more' | 'drone' | 'battery' | 'route' | 'alert' | 'clock' | 'check' | 'upload' | 'wind' | 'play' | 'download' | 'filter' | 'pin' | 'speed' | 'cloud' | 'sliders' | 'refresh' | 'eye' | 'trash'| 'logout';

const paths: Record<IconName, ReactNode> = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
  mission: <><path d="M5 20h14M7 17V8l5-4 5 4v9"/><path d="M9 12h6M12 9v6"/></>,
  radar: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="m12 12 6-6M12 3v2M3 12h2M12 19v2M19 12h2"/></>,
  spark: <><path d="m12 3-1.3 4.1a5 5 0 0 1-3.2 3.2L3.5 12l4 1.4a5 5 0 0 1 3.2 3.2L12 21l1.4-4.4a5 5 0 0 1 3.2-3.2l4-1.4-4-1.7a5 5 0 0 1-3.2-3.2L12 3Z"/></>,
  chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
  file: <><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></>, bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"/></>, user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  propeller: <><circle cx="12" cy="12" r="2"/><path d="M10.5 10.5C7 9 4 6 5 4s5 .2 6 6.5M13.5 10.5C15 7 18 4 20 5s-.2 5-6.5 6M13.5 13.5C17 15 20 18 19 20s-5-.2-6-6.5M10.5 13.5C9 17 6 20 4 19s.2-5 6.5-6"/></>,
  chevron: <path d="m9 18 6-6-6-6"/>, close: <path d="M18 6 6 18M6 6l12 12"/>, collapse: <path d="m14 7-5 5 5 5"/>, menu: <path d="M4 7h16M4 12h16M4 17h16"/>, search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>, sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></>, moon: <path d="M20 15.5A8 8 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z"/>, arrow: <path d="M5 12h14M14 6l6 6-6 6"/>, plus: <path d="M12 5v14M5 12h14"/>, more: <><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></>,
  drone: <><path d="M8 12h8M10 12v4h4v-4M7 8 4 5M17 8l3-3M7 16l-3 3M17 16l3 3"/><circle cx="6" cy="8" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="6" cy="16" r="2"/><circle cx="18" cy="16" r="2"/></>, battery: <><rect x="3" y="7" width="17" height="10" rx="2"/><path d="M21 10v4M6 10v4M10 10v4M14 10v4"/></>, route: <><circle cx="5" cy="18" r="2"/><circle cx="19" cy="6" r="2"/><path d="M7 18c7 0 2-12 10-12"/></>, alert: <><path d="M12 3 2.5 20h19L12 3Z"/><path d="M12 9v5M12 17h.01"/></>, clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>, check: <path d="m5 12 4 4L19 6"/>, upload: <><path d="M12 16V4M7 9l5-5 5 5M4 20h16"/></>, wind: <><path d="M3 8h11c4 0 4-5 1-5M3 12h16c4 0 4 6 0 6M3 16h8"/></>, play: <path d="m8 5 11 7-11 7z"/>, download: <><path d="M12 4v12M7 11l5 5 5-5M4 20h16"/></>, filter: <path d="M4 5h16l-6 7v6l-4 2v-8z"/>, pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2"/></>, speed: <><path d="M4 17a9 9 0 1 1 16 0M12 15l4-5"/></>, cloud: <path d="M6 18a4 4 0 0 1 0-8 6 6 0 0 1 11.5 1.5A3.5 3.5 0 1 1 18 18H6Z"/>, sliders: <><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="10" cy="18" r="2"/></>, refresh: <><path d="M20 6v5h-5M4 18v-5h5"/><path d="M18 11a7 7 0 0 0-12-4M6 13a7 7 0 0 0 12 4"/></>, eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></>, trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/></>, 
  logout: (
  <>
    <path d="M10 5H5v14h5" />

    <path d="M14 8l4 4-4 4M18 12H9" />
  </>
),
};

export function Icon({ name, size = 20, className, ...props }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}
