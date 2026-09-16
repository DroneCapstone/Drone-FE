import { useState } from "react";
import { NavLink } from "react-router-dom";
import { ActionButton } from "../../../components/ui/ActionButton";
import { Icon } from "../../../components/ui/Icon";
import { AreaChart } from "../components/AreaChart";
import { MetricCard } from "../components/MetricCard";
import { OperationalStateBar } from "../components/OperationalStateBar";
import { OperatorPanel } from "../components/OperatorPanel";
import { PageHeader } from "../components/PageHeader";

export function DashboardPage() {
  const [period, setPeriod] = useState<"Today" | "Week" | "Month">("Today");
  const periodData = {
    Today: {
      total: "133",
      delta: "+12.4% vs yesterday",
      labels: ["06:00", "09:00", "12:00", "15:00", "18:00", "21:00"],
    },
    Week: {
      total: "812",
      delta: "+6.8% vs last week",
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    },
    Month: {
      total: "3,284",
      delta: "+4.1% vs last month",
      labels: ["W1", "W2", "W3", "W4", "Today", "Forecast"],
    },
  }[period];
  return (
    <>
      <PageHeader
        section="dashboard"
        // action={
        //   <>
        //     <ActionButton variant="secondary">Export snapshot</ActionButton>
        //     <NavLink
        //       to="/operator/missions/create"
        //       className="button button-primary"
        //     >
        //       New mission
        //     </NavLink>
        //   </>
        // }
        action={
          <div style={{ display: "flex", gap: "9px" }}>
            <ActionButton variant="secondary">Export snapshot</ActionButton>
            <NavLink
              to="/operator/missions/create"
              className="button button-primary"
            >
              New mission
            </NavLink>
          </div>
        }
      />
      <OperationalStateBar />
      <div className="dashboard-grid lower primary-operations">
        <OperatorPanel
          title="Active flights"
          eyebrow="LIVE AIRSPACE"
          action={
            <NavLink className="text-button" to="/operator/operations/live">
              Open live map
            </NavLink>
          }
        >
          <div className="mini-map">
            <div className="map-grid" />
            <div className="route-line route-a" />
            <div className="route-line route-b" />
            <span className="map-zone zone-a">SGN-N</span>
            <span className="map-zone zone-b">SGN-C</span>
            <span className="drone-pin pin-a">
              <Icon name="drone" size={17} />
              <b>AX-17</b>
            </span>
            <span className="drone-pin pin-b">
              <Icon name="drone" size={17} />
              <b>NX-08</b>
            </span>
            <span className="drone-pin pin-c">
              <Icon name="drone" size={17} />
              <b>AX-04</b>
            </span>
            <div className="map-stat">
              <i />8 flights active{" "}
              <span>2 controlled zones · updated 14:18:42 ICT</span>
            </div>
          </div>
        </OperatorPanel>
        <OperatorPanel
          title="Priority alerts"
          eyebrow="ACTION REQUIRED"
          action={<span className="counter">3 open</span>}
        >
          <div className="alert-list">
            <div className="alert-row warning">
              <span className="alert-icon">
                <Icon name="wind" />
              </span>
              <div>
                <strong>Wind threshold approaching</strong>
                <small>NX-08 · waypoint N-07 · 2 min ago</small>
              </div>
              <Icon name="chevron" size={15} />
            </div>
            <div className="alert-row danger">
              <span className="alert-icon">
                <Icon name="battery" />
              </span>
              <div>
                <strong>Reserve energy below plan</strong>
                <small>MX-22 · projected landing reserve 18%</small>
              </div>
              <Icon name="chevron" size={15} />
            </div>
            <div className="alert-row info">
              <span className="alert-icon">
                <Icon name="clock" />
              </span>
              <div>
                <strong>Approval window closing</strong>
                <small>MSN-2828 · 18 min remaining</small>
              </div>
              <Icon name="chevron" size={15} />
            </div>
          </div>
        </OperatorPanel>
      </div>
      <div className="dashboard-section-label">
        <span>TODAY’S OPERATING BASELINE</span>
        <small>Compared with the previous 14-day median</small>
      </div>
      <div className="metric-grid">
        <MetricCard
          label="Mission completion"
          value="94.8%"
          delta="+3.2%"
          note="126 of 133 completed"
        />
        <MetricCard
          label="Active flights"
          value="08"
          delta="Live"
          note="14 aircraft available"
        />
        <MetricCard
          label="Energy efficiency"
          value="87.4%"
          delta="+1.8%"
          note="4.2 kWh saved today"
        />
        <MetricCard
          label="Route efficiency"
          value="91.2%"
          delta="+4.6%"
          note="12.8 km optimized"
        />
      </div>
      <div className="dashboard-grid">
        <OperatorPanel
          title="Mission throughput"
          eyebrow="OPERATING PERIOD"
          className="chart-panel"
          action={
            <div className="segmented">
              {(["Today", "Week", "Month"] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  className={period === item ? "active" : ""}
                  onClick={() => setPeriod(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          }
        >
          <div className="chart-summary">
            <strong>{periodData.total}</strong>
            <span>total missions</span>
            <span className="summary-delta">{periodData.delta}</span>
          </div>
          <AreaChart
            orange
            variant="throughput"
            unit="missions / hour"
            yLabels={["40", "30", "20", "10"]}
            pointLabel="32 missions completed at 18:00"
          />
          <div className="chart-labels">
            {periodData.labels.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
        </OperatorPanel>
        <OperatorPanel
          title="Mission status"
          eyebrow="TODAY"
          action={
            <NavLink className="text-button" to="/operator/missions/all">
              View all
            </NavLink>
          }
        >
          <div className="donut-wrap">
            <div className="donut">
              <div>
                <strong>133</strong>
                <span>Total</span>
              </div>
            </div>
            <div className="donut-legend">
              <span>
                <i className="green" />
                Completed <b>94</b>
              </span>
              <span>
                <i className="orange" />
                In flight <b>8</b>
              </span>
              <span>
                <i className="blue" />
                Scheduled <b>25</b>
              </span>
              <span>
                <i className="red" />
                At risk <b>6</b>
              </span>
            </div>
          </div>
        </OperatorPanel>
      </div>
    </>
  );
}
