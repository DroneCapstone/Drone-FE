import { useState } from "react";
import { StatusBadge } from "../../../../components/ui/StatusBadge";
import { AreaChart } from "../../components/AreaChart";
import { MetricCard } from "../../components/MetricCard";
import { OperatorPanel } from "../../components/OperatorPanel";
import { AiPageShell } from "./AiPageShell";

export function PredictionPage() {
  const [tab, setTab] = useState("Energy consumption");
  return (
    <AiPageShell active="/operator/ai/prediction">
      <div className="inner-tabs">
        {["Energy consumption", "Flight duration", "Flight performance"].map(
          (item) => (
            <button
              className={tab === item ? "active" : ""}
              onClick={() => setTab(item)}
              key={item}
            >
              {item}
            </button>
          ),
        )}
      </div>
      <div className="ai-grid">
        <OperatorPanel
          title={tab}
          eyebrow="PREDICTED OUTCOME"
          className="prediction-panel"
        >
          <div className="prediction-value">
            <span>Estimated energy use</span>
            <strong>
              28.6<small>%</small>
            </strong>
            <StatusBadge tone="success">92% confidence</StatusBadge>
          </div>
          <AreaChart
            orange
            variant="energy"
            unit="battery used (%)"
            yLabels={["40", "30", "20", "10"]}
            pointLabel="Predicted 28.6% consumption at arrival"
          />
          <div className="chart-labels">
            <span>Launch</span>
            <span>Waypoint 2</span>
            <span>Waypoint 4</span>
            <span>Arrival</span>
          </div>
        </OperatorPanel>
        <OperatorPanel title="Prediction inputs" eyebrow="MISSION MSN-2841">
          <dl className="key-values">
            <div>
              <dt>Route distance</dt>
              <dd>18.4 km</dd>
            </div>
            <div>
              <dt>Payload</dt>
              <dd>4.8 kg</dd>
            </div>
            <div>
              <dt>Cruise altitude</dt>
              <dd>120 m</dd>
            </div>
            <div>
              <dt>Avg. headwind</dt>
              <dd>11 km/h</dd>
            </div>
            <div>
              <dt>Drone health</dt>
              <dd>
                <StatusBadge tone="success">Optimal</StatusBadge>
              </dd>
            </div>
          </dl>
          <div className="confidence-note">
            <span>
              Prediction is within the model’s high-confidence operating range.
            </span>
          </div>
        </OperatorPanel>
      </div>
      <div className="metric-grid three">
        <MetricCard
          label="Energy at arrival"
          value="71.4%"
          delta="Safe"
          note="21.4% above reserve"
        />
        <MetricCard
          label="Flight duration"
          value="28m 12s"
          delta="−1m 08s"
          note="Compared with route plan"
        />
        <MetricCard
          label="Performance score"
          value="93/100"
          delta="Top 8%"
          note="Across similar missions"
        />
      </div>
    </AiPageShell>
  );
}
