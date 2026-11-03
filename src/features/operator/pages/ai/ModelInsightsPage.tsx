import { MetricCard } from '../../components/MetricCard';
import { OperatorPanel } from '../../components/OperatorPanel';
import { AiPageShell } from './AiPageShell';

const features = [
  ['Flight duration', 82],
  ['Distance', 71],
  ['Altitude', 66],
  ['Payload', 49],
  ['Relative wind angle', 36],
] as const;

export function ModelInsightsPage() {
  return (
    <AiPageShell active="/operator/ai/model-insights">
      {/* <div className="model-insights-intro">
        <strong>Model monitoring, not mission dispatch.</strong>
        <span>Use this area to review prediction quality and global behavior across historical flights.</span>
      </div> */}

      <div className="metric-grid four">
        <MetricCard label="Energy MAE" value="1.94 Wh" delta="Holdout" note="Average absolute error" />
        <MetricCard label="Energy RMSE" value="2.85 Wh" delta="Holdout" note="Penalizes larger misses" />
        <MetricCard label="R²" value="0.82" delta="Baseline" note="Flight-level linear model" />
        <MetricCard label="Model scope" value="207" delta="Flights" note="Mock research snapshot" />
      </div>

      <div className="ai-grid">
        <OperatorPanel title="Global feature importance" eyebrow="MODEL BEHAVIOR">
          <p className="panel-intro">Global importance summarizes what the model usually relies on across the dataset. It is different from Local SHAP for one Mission.</p>
          <div className="feature-bars">
            {features.map(([label, value]) => (
              <div key={label}><span>{label}<small>{value}%</small></span><div><i style={{ width: `${value}%` }} /></div></div>
            ))}
          </div>
        </OperatorPanel>

        <OperatorPanel title="How to use this page" eyebrow="OPERATIONS + RESEARCH">
          <div className="reasoning-block"><p>Use Model Insights for periodic review: predicted vs actual energy, duration error, drift, and global feature behavior. It does not change a live Mission.</p></div>
          <dl className="key-values">
            <div><dt>Mission planning</dt><dd>Use Mission Analysis instead</dd></div>
            {/* Scenario simulation disabled — do not link users to an unavailable feature.
            <div><dt>What-if testing</dt><dd>Use Scenario Simulation</dd></div>
            */}
            <div><dt>Live Mission</dt><dd>AI may alert, but cannot silently alter execution</dd></div>
            <div><dt>Completed Mission</dt><dd>Compare predicted vs actual outcomes</dd></div>
          </dl>
        </OperatorPanel>
      </div>
    </AiPageShell>
  );
}
