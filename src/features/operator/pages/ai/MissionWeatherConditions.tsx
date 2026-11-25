import { useEffect, useState } from 'react';
import type { RouteOption, RouteWeatherConditions } from '../../types/operator';
import './mission-weather-conditions.css';

interface MissionWeatherConditionsProps {
  route: RouteOption;
  /** Analyze has not finished fetching the selected route yet. */
  isLoading?: boolean;
}

function formatWeather(value: number | undefined, unit: string, decimals = 1): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? `${value.toFixed(decimals)}${unit}`
    : '—';
}

function weatherSignature(item: RouteWeatherConditions | undefined): string {
  if (!item) return 'missing';
  return JSON.stringify({
    temperatureC: item.temperatureC,
    windSpeedMs: item.windSpeedMs,
    windGustMs: item.windGustMs,
    humidityPct: item.humidityPct,
    precipitationMm: item.precipitationMm,
    conditionLabel: item.conditionLabel,
    warningMessage: item.warningMessage,
  });
}

/** Weather is part of the Analyze response, not a second API request.
 * This panel never spins indefinitely after Analyze completes without weather. */
export function MissionWeatherConditions({ route, isLoading = false }: MissionWeatherConditionsProps) {
  const [legIndex, setLegIndex] = useState(0);
  useEffect(() => setLegIndex(0), [route.id]);

  const legs = [...(route.legDetails ?? [])].sort((a, b) =>
    (a.sequence_no ?? 0) - (b.sequence_no ?? 0),
  );
  const perLegWeather = legs.map((leg) => leg.weather);
  const hasDistinctLegWeather = legs.length > 1 &&
    perLegWeather.some((item) => weatherSignature(item) !== weatherSignature(perLegWeather[0]));

  // Prefer the selected leg's own forecast, then the route's common forecast.
  // If Analyze only supplies leg weather, default to its first available leg.
  const activeLeg = legs[Math.min(legIndex, Math.max(legs.length - 1, 0))];
  const weather = activeLeg?.weather ?? route.weather ?? perLegWeather.find(Boolean);
  const hasValues = weather && [
    weather.temperatureC, weather.windSpeedMs, weather.windGustMs,
    weather.humidityPct, weather.precipitationMm, weather.conditionLabel,
    weather.weatherSummary,
  ].some((value) => value !== undefined && value !== '');

  return (
    <section className="mission-ai-evidence-weather mission-weather-panel" aria-label="Weather Conditions">
      <div className="mission-weather-panel-heading">
        <h2>Weather Conditions</h2>
        {hasDistinctLegWeather && (
          <select
            aria-label="View weather for flight leg"
            value={Math.min(legIndex, legs.length - 1)}
            onChange={(event) => setLegIndex(Number(event.target.value))}
          >
            {legs.map((leg, index) => (
              <option key={`${leg.sequence_no ?? index}-${leg.from_hub_code}`} value={index}>
                Leg {leg.sequence_no ?? index + 1}
              </option>
            ))}
          </select>
        )}
      </div>

      {!hasValues ? (
        isLoading ? (
          <div className="mission-weather-panel-loading" role="status" aria-live="polite">
            <span className="mission-weather-panel-spinner" aria-hidden="true" />
            <span>Loading weather conditions…</span>
          </div>
        ) : (
          <p className="mission-weather-panel-unavailable" role="status">
            Weather data was not provided by the Analyze response.
          </p>
        )
      ) : (
        <>
          <div className="mission-weather-panel-primary">
            <strong>{formatWeather(weather?.temperatureC, '°C')}</strong>
            {weather?.conditionLabel && <span>{weather.conditionLabel}</span>}
          </div>
          <div className="mission-weather-panel-grid">
            <div><small>Wind speed</small><strong>{formatWeather(weather?.windSpeedMs, ' m/s')}</strong></div>
            <div><small>Wind gust</small><strong>{formatWeather(weather?.windGustMs, ' m/s')}</strong></div>
            <div><small>Humidity</small><strong>{formatWeather(weather?.humidityPct, '%', 0)}</strong></div>
            <div><small>Precipitation</small><strong>{formatWeather(weather?.precipitationMm, ' mm')}</strong></div>
          </div>
          {weather?.warningMessage && <p className="mission-weather-panel-warning">{weather.warningMessage}</p>}
          {!weather?.conditionLabel && weather?.weatherSummary && (
            <p className="mission-weather-panel-summary">{weather.weatherSummary}</p>
          )}
        </>
      )}
    </section>
  );
}
