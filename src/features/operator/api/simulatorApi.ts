import { operatorApiRequest } from './orderApi';

const SIMULATOR_CONFIG_PATH = '/operator/missions/simulator/config';

/** BE configuration is shared by the simulator, not scoped to a mission. */
export interface SimulatorSpeedConfig {
  speedMultiplier: number;
}

function readSpeed(payload: unknown): SimulatorSpeedConfig | undefined {
  // Swagger does not specify an object response schema; accept JSON-encoded objects too.
  if (typeof payload === 'string') {
    try { payload = JSON.parse(payload); } catch { return undefined; }
  }
  if (!payload || typeof payload !== 'object') return undefined;
  const record = payload as Record<string, unknown>;
  // Accept a flat configuration or a config wrapper; never invent a speed.
  const nested = record.config;
  const value = record.speed_multiplier ?? (
    nested && typeof nested === 'object'
      ? (nested as Record<string, unknown>).speed_multiplier
      : undefined
  );
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0.1 || value > 100) return undefined;
  return { speedMultiplier: value };
}

export async function getSimulatorSpeedApi(): Promise<SimulatorSpeedConfig> {
  const config = readSpeed(await operatorApiRequest<unknown>(SIMULATOR_CONFIG_PATH));
  if (!config) throw new Error('Simulator response does not contain a valid speed_multiplier.');
  return config;
}

export async function updateSimulatorSpeedApi(speedMultiplier: number): Promise<SimulatorSpeedConfig> {
  if (!Number.isFinite(speedMultiplier) || speedMultiplier < 0.1 || speedMultiplier > 100) {
    throw new Error('Simulation speed must be between 0.1 and 100.');
  }
  const response = await operatorApiRequest<unknown>(SIMULATOR_CONFIG_PATH, {
    method: 'PATCH',
    body: JSON.stringify({ speed_multiplier: speedMultiplier }),
  });
  // Do not assume PATCH succeeded at the requested value if its body omits it.
  const config = readSpeed(response) ?? await getSimulatorSpeedApi();
  if (config.speedMultiplier !== speedMultiplier) {
    throw new Error(`Simulator returned ${config.speedMultiplier}× instead of ${speedMultiplier}×.`);
  }
  return config;
}
