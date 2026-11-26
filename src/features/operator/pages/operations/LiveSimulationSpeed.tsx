import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSimulatorSpeedApi, updateSimulatorSpeedApi } from '../../api/simulatorApi';
import './live-simulation-speed.css';

const SPEED_QUERY_KEY = ['operator', 'simulator', 'interval-config'] as const;
const SPEED_OPTIONS = [3, 2, 1];
function speedLabel(interval: number): string {
  if (interval === 3) return 'Normal (3s)';
  if (interval === 2) return 'Fast (2s)';
  if (interval === 1) return 'Very fast (1s)';
  return `${interval}s interval`;
}
const SCOPE = 'Simulation interval (all simulated aircraft). Shorter intervals may speed up simulated flights; active-flight behavior depends on the server.';

export function LiveSimulationSpeed() {
  const queryClient = useQueryClient();
  const update = useMutation({
    mutationFn: updateSimulatorSpeedApi,
    retry: false,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: SPEED_QUERY_KEY });
    },
    onSuccess: (config) => {
      queryClient.setQueryData(SPEED_QUERY_KEY, config);
    },
    // A failed response may still have applied the write. Read actual BE state.
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: SPEED_QUERY_KEY });
    },
  });
  const config = useQuery({
    queryKey: SPEED_QUERY_KEY,
    queryFn: getSimulatorSpeedApi,
    staleTime: 10_000,
    retry: false,
    refetchOnWindowFocus: !update.isPending,
    refetchOnReconnect: !update.isPending,
  });
  const speed = config.data?.intervalSec;
  // Display the actual BE value even when it is outside the offered presets.
  const options = speed === undefined || SPEED_OPTIONS.includes(speed)
    ? SPEED_OPTIONS
    : [...SPEED_OPTIONS, speed].sort((a, b) => b - a);
  const unavailable = config.isError || speed === undefined;
  const busy = update.isPending || config.isFetching;
  const error = update.error ?? config.error;
  const errorMessage = error instanceof Error ? error.message : 'Unable to load simulation speed.';

  return (
    <div className="live-simulation-speed" title={SCOPE}>
      <div className="live-simulation-speed-control">
        <select
          aria-label="Simulation interval (all simulated aircraft)"
          title={SCOPE}
          value={speed === undefined ? '' : String(speed)}
          disabled={busy || unavailable}
          aria-busy={busy}
          onChange={(event) => {
            if (busy || unavailable) return;
            const next = Number(event.currentTarget.value);
            if (SPEED_OPTIONS.includes(next) && next !== speed) update.mutate(next);
          }}
        >
          {speed === undefined && <option value="">{config.isError ? 'Speed: unavailable' : 'Speed: loading…'}</option>}
          {options.map((option) => (
            <option key={option} value={option} disabled={!SPEED_OPTIONS.includes(option)}>Speed: {speedLabel(option)}</option>
          ))}
        </select>
        {config.isError && <button type="button" disabled={busy} title="Retry loading simulation speed" aria-label="Retry loading simulation speed" onClick={() => { update.reset(); void config.refetch(); }}>↻</button>}
      </div>
      {update.isPending ? <small role="status">Updating speed…</small> : error ? (
        <small className="live-simulation-speed-error" role="alert">{errorMessage}</small>
      ) : null}
    </div>
  );
}
