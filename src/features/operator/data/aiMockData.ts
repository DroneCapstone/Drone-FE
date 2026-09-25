import type { RouteAiAnalysis } from '../types/operator';

export const routeAiAnalyses: Record<string, RouteAiAnalysis> = {
  'R-04': {
    routeId: 'R-04',
    weather: { temperatureC: 29.4, humidityPct: 72, windSpeedMs: 5.2, windGustMs: 7.1, windDirectionDeg: 215, precipitationMm: 0, cloudCoverPct: 46, relativeWindAngleDeg: 118 },
    shapFactors: [
      { feature: 'Distance', impactWh: 3.1, direction: 'increase', note: '18.4 km route length increases expected energy use.' },
      { feature: 'Payload', impactWh: 2.2, direction: 'increase', note: 'Current package mass is above the model median.' },
      { feature: 'Wind speed', impactWh: 1.4, direction: 'increase', note: 'Crosswind adds control effort on the coastal segment.' },
      { feature: 'Relative wind angle', impactWh: 0.6, direction: 'decrease', note: 'Part of the route benefits from a favorable wind angle.' },
      { feature: 'Temperature', impactWh: 0.2, direction: 'decrease', note: 'Temperature is within the model’s normal operating range.' },
    ],
    operationalRisks: [
      { label: 'Weather', level: 'Low', detail: 'Crosswind remains below the mock advisory threshold.' },
      { label: 'Energy margin', level: 'Low', detail: 'Expected landing reserve remains above the 20% minimum.' },
      { label: 'Route exposure', level: 'Low', detail: 'No significant weather or corridor warning in the mock scenario.' },
    ],
  },
  'R-08': {
    routeId: 'R-08',
    weather: { temperatureC: 30.1, humidityPct: 75, windSpeedMs: 5.8, windGustMs: 8.6, windDirectionDeg: 208, precipitationMm: 0.2, cloudCoverPct: 58, relativeWindAngleDeg: 94 },
    shapFactors: [
      { feature: 'Payload', impactWh: 3.0, direction: 'increase', note: 'Payload has a stronger effect on the shorter, higher-power urban profile.' },
      { feature: 'Wind gust', impactWh: 2.4, direction: 'increase', note: 'Urban gusts increase stabilization demand.' },
      { feature: 'Speed', impactWh: 1.9, direction: 'increase', note: 'Higher cruise speed supports the fastest arrival but costs energy.' },
      { feature: 'Distance', impactWh: 1.3, direction: 'increase', note: 'Distance is shortest, but power demand is higher.' },
      { feature: 'Pressure', impactWh: 0.1, direction: 'decrease', note: 'Current pressure has little effect on this prediction.' },
    ],
    operationalRisks: [
      { label: 'Weather', level: 'Medium', detail: 'Gusts are higher around the urban corridor.' },
      { label: 'Energy margin', level: 'Medium', detail: 'Reserve is safe but lower than the recommended route.' },
      { label: 'Route exposure', level: 'Medium', detail: 'More dense corridor transitions require closer monitoring.' },
    ],
  },
  'R-12': {
    routeId: 'R-12',
    weather: { temperatureC: 29.0, humidityPct: 70, windSpeedMs: 4.6, windGustMs: 6.3, windDirectionDeg: 220, precipitationMm: 0, cloudCoverPct: 41, relativeWindAngleDeg: 142 },
    shapFactors: [
      { feature: 'Flight duration', impactWh: 3.4, direction: 'increase', note: 'Longer duration adds baseline consumption.' },
      { feature: 'Distance', impactWh: 2.8, direction: 'increase', note: 'This is the longest candidate route.' },
      { feature: 'Relative wind angle', impactWh: 1.5, direction: 'decrease', note: 'A favorable wind angle offsets part of the longer route.' },
      { feature: 'Payload', impactWh: 1.2, direction: 'increase', note: 'Package mass increases propulsion demand.' },
      { feature: 'Wind speed', impactWh: 0.9, direction: 'decrease', note: 'Wind exposure is lower than on the other candidates.' },
    ],
    operationalRisks: [
      { label: 'Weather', level: 'Low', detail: 'Lowest gust and headwind exposure among the candidates.' },
      { label: 'Energy margin', level: 'Low', detail: 'Highest expected battery reserve among the candidates.' },
      { label: 'Delivery timing', level: 'Low', detail: 'Planned timing still reaches the customer delivery window.' },
    ],
  },
};
