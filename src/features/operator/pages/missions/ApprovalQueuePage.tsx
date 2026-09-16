import { useState } from "react";
import { ActionButton } from "../../../../components/ui/ActionButton";
import { Icon } from "../../../../components/ui/Icon";
import { StatusBadge } from "../../../../components/ui/StatusBadge";
import { OperatorPanel } from "../../components/OperatorPanel";
import { MissionPageShell } from "./MissionPageShell";

export function ApprovalQueuePage() {
  const [decision, setDecision] = useState("");
  const [toast, setToast] = useState("");
  const decide = (value: string) => {
    setDecision(value);
    setToast(
      `Mission ${value.toLowerCase()}${value === "Approved" ? " for launch" : ""}`,
    );
    setTimeout(() => setToast(""), 2400);
  };
  return (
    <MissionPageShell active="/operator/missions/approvals">
      <div className="approval-layout">
        <div className="queue-list">
          <div className="queue-head">
            <span>Waiting for review</span>
            <span className="badge badge-neutral">3 pending</span>
          </div>
          {["MSN-2850", "MSN-2848", "MSN-2844"].map((id, index) => (
            <button
              className={`queue-card ${index === 0 ? "active" : ""}`}
              key={id}
            >
              <span>
                <strong>
                  {
                    [
                      "West bay urgent supply",
                      "Industrial zone inspection",
                      "Canal mapping run",
                    ][index]
                  }
                </strong>
                <small>
                  {id} · submitted {index * 8 + 4} min ago
                </small>
              </span>
              <StatusBadge tone={index === 0 ? "danger" : "neutral"}>
                {index === 0 ? "High" : "Normal"}
              </StatusBadge>
            </button>
          ))}
        </div>
        <OperatorPanel className="approval-detail">
          <div className="approval-title">
            <div>
              <span className="eyebrow">APPROVAL REVIEW</span>
              <h2>West bay urgent supply</h2>
              <p>MSN-2850 · Submitted by Linh Tran</p>
            </div>
            {decision ? (
              <StatusBadge
                tone={decision === "Approved" ? "success" : "danger"}
              >
                {decision}
              </StatusBadge>
            ) : (
              <StatusBadge tone="neutral">Pending</StatusBadge>
            )}
          </div>
          <div
            className="risk-banner"
            style={{
              color: "var(--text)",
              background: "var(--surface-2)",
              borderColor: "var(--border)",
            }}
          >
            <div>
              <strong>
                Risk assessment:{" "}
                <span style={{ color: "#e89b35" }}>Moderate</span>
              </strong>
              <span style={{ color: "var(--muted)" }}>
                Crosswind exposure is 12% above the preferred threshold at
                waypoint W-04.
              </span>
            </div>
            <strong>72/100</strong>
          </div>
          <div className="approval-facts">
            <span>
              <small>Aircraft</small>
              <strong>CX-09</strong>
            </span>
            <span>
              <small>Distance</small>
              <strong>22.6 km</strong>
            </span>
            <span>
              <small>Payload</small>
              <strong>6.2 kg</strong>
            </span>
            <span>
              <small>Energy reserve</small>
              <strong>28%</strong>
            </span>
          </div>
          <h3>Pre-flight checklist</h3>
          <div className="checklist">
            <span>
              <Icon name="check" />
              Aircraft readiness verified
            </span>
            <span>
              <Icon name="check" />
              Payload within certified limit
            </span>
            <span>
              <Icon name="check" />
              Airspace authorization confirmed
            </span>
            <span className="warn" style={{ color: "var(--muted)" }}>
              <Icon name="alert" />
              Weather threshold requires operator review
            </span>
          </div>
          <div className="approval-actions">
            <ActionButton variant="danger" onClick={() => decide("Rejected")}>
              Reject
            </ActionButton>
            <ActionButton onClick={() => decide("Approved")}>
              Approve mission
            </ActionButton>
          </div>
        </OperatorPanel>
        {toast && (
          <div className="toast">
            <Icon name="check" />
            {toast}
          </div>
        )}
      </div>
    </MissionPageShell>
  );
}
