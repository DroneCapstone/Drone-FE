import { operatorApiRequest } from './orderApi';

const SIMULATOR_CONFIG_PATH = '/system/simulator-config';

/** Shared simulator configuration, not an individual aircraft's flight speed. */
export interface SimulatorSpeedConfig {
  intervalSec: number;
}

function readInterval(payload: unknown): SimulatorSpeedConfig | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  const record = payload as Record<string, unknown>;
  const nested = record.config;
  const value = record.interval_sec ?? (
    nested && typeof nested === 'object'
      ? (nested as Record<string, unknown>).interval_sec
      : undefined
  );
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return undefined;
  return { intervalSec: value };
}

export async function getSimulatorSpeedApi(): Promise<SimulatorSpeedConfig> {
  const config = readInterval(await operatorApiRequest<unknown>(SIMULATOR_CONFIG_PATH));
  if (!config) throw new Error('Simulator response does not contain a valid interval_sec.');
  return config;
}

export async function updateSimulatorSpeedApi(intervalSec: number): Promise<SimulatorSpeedConfig> {
  // Only offer positive integer presets; fractional limits are not documented.
  if (![1, 2, 3].includes(intervalSec)) {
    throw new Error('Choose a simulation interval of 1, 2 or 3 seconds.');
  }
  const response = await operatorApiRequest<unknown>(SIMULATOR_CONFIG_PATH, {
    method: 'PATCH',
    body: JSON.stringify({ interval_sec: intervalSec }),
  });
  const config = readInterval(response) ?? await getSimulatorSpeedApi();
  if (config.intervalSec !== intervalSec) {
    throw new Error(`Simulator returned ${config.intervalSec}s instead of ${intervalSec}s.`);
  }
  return config;
}
