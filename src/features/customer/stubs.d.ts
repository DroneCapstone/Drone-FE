declare namespace JSX { interface IntrinsicElements { [elemName: string]: any; } }
declare namespace React { type ReactNode = any; }
declare module 'react' {
  export type ReactNode = any;
  export type ComponentType<P = any> = any;
  export function useState<T>(initial: T | (() => T)): [T, (value: T | ((prev: T) => T)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: readonly any[]): void;
  export function useMemo<T>(factory: () => T, deps: readonly any[]): T;
  export function lazy<T>(factory: () => Promise<T>): any;
}
declare module 'react/jsx-runtime' { export const jsx: any; export const jsxs: any; export const Fragment: any; }
declare module 'react-router-dom' {
  export const Link: any;
  export const Navigate: any;
  export type RouteObject = any;
  export function useNavigate(): any;
  export function useParams<T = any>(): any;
  export function useLocation(): any;
  export function useSearchParams(): [URLSearchParams, any];
}
declare module 'lucide-react' { const icons: any; export = icons; }
declare module '*.png' { const src: string; export default src; }
declare module '*.webp' { const src: string; export default src; }
interface ImportMetaEnv { VITE_API_BASE_URL?: string; }
interface ImportMeta { env: ImportMetaEnv; }
