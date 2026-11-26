import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSimulatorSpeedApi, updateSimulatorSpeedApi } from '../../api/simulatorApi';
import './live-simulation-speed.css';

const SPEED_QUERY_KEY = ['operator', 'simulator', 'speed-config'] as const;
const SPEED_OPTIONS = [1, 2, 4, 8, 16, 32];
const SCOPE = 'Simulation speed applies to the simulator, not just the selected aircraft.';

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
  const speed = config.data?.speedMultiplier;
  // If another client has set 0.5x, 3x, etc., show that actual value as well.
  const options = speed === undefined || SPEED_OPTIONS.includes(speed)
    ? SPEED_OPTIONS
    : [...SPEED_OPTIONS, speed].sort((a, b) => a - b);
  const unavailable = config.isError || speed === undefined;
  const busy = update.isPending || config.isFetching;
  const error = update.error ?? config.error;
  const errorMessage = error instanceof Error ? error.message : 'Unable to load simulation speed.';

  return (
    <div className="live-simulation-speed" title={SCOPE}>
      <div className="live-simulation-speed-control">
        <select
          aria-label="Simulation speed (all simulated aircraft)"
          title={SCOPE}
          value={speed === undefined ? '' : String(speed)}
          disabled={busy || unavailable}
          aria-busy={busy}
          onChange={(event) => {
            if (busy || unavailable) return;
            const next = Number(event.currentTarget.value);
            if (options.includes(next) && next !== speed) update.mutate(next);
          }}
        >
          {speed === undefined && <option value="">{config.isError ? 'Speed: unavailable' : 'Speed: loading…'}</option>}
          {options.map((option) => (
            <option key={option} value={option}>Speed: {option}×</option>
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
