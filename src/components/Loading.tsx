export function Loading({ label = 'Loading...' }: { label?: string }) {
  return <p className="state state-loading">{label}</p>;
}
