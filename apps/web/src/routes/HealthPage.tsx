import { useState, useEffect } from "react";
import { fetchHealth } from "../api/client.js";
import type { HealthSummary } from "../api/client.js";
import { Icon, type IconName } from "../components/Icon.js";

function statusIcon(status: "ok" | "degraded" | "down"): IconName {
  if (status === "ok") return "check";
  if (status === "degraded") return "warning";
  return "error";
}

function statusClass(status: "ok" | "degraded" | "down"): string {
  if (status === "ok") return "health-card-value--ok";
  if (status === "degraded") return "health-card-value--warning";
  return "health-card-value--error";
}

function statusColor(status: "ok" | "degraded" | "down"): string {
  if (status === "ok") return "var(--status-completed)";
  if (status === "degraded") return "var(--status-preparing)";
  return "var(--status-failed)";
}

const SERVICE_ICONS: Record<"api" | "convex" | "t3" | "github", IconName> = {
  api: "server",
  convex: "database",
  t3: "code",
  github: "github",
};

export function HealthPage() {
  const [health, setHealth] = useState<HealthSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHealth()
      .then(setHealth)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !health) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <span className="spinner"><Icon name="loading" size={32} /></span>
        </div>
        <div className="empty-state-title">Checking system health…</div>
      </div>
    );
  }

  const services: { key: keyof Pick<HealthSummary, "api" | "convex" | "t3" | "github">; label: string }[] = [
    { key: "api", label: "API Server" },
    { key: "convex", label: "Convex" },
    { key: "t3", label: "T3 Code" },
    { key: "github", label: "GitHub" },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title" id="page-title-health">Health</h1>
        <p className="page-subtitle">System status and diagnostics</p>
      </div>

      {/* Service Status Grid */}
      <div className="health-grid" style={{ marginBottom: "var(--space-md)" }}>
        {services.map((svc, i) => (
          <div key={svc.key} className="card health-card stagger-item" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="health-card-icon">
              <Icon name={SERVICE_ICONS[svc.key]} size={28} style={{ color: statusColor(health[svc.key]) }} />
            </div>
            <div className="health-card-label">{svc.label}</div>
            <div className={`health-card-value ${statusClass(health[svc.key])}`} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
              <Icon name={statusIcon(health[svc.key])} size={14} />
              {health[svc.key].toUpperCase()}
            </div>
          </div>
        ))}
      </div>

      {/* Job Stats */}
      <div className="detail-section stagger-item" style={{ animationDelay: "200ms" }}>
        <div className="detail-section-title">Job Statistics</div>
        <div className="card">
          <div className="detail-row">
            <span className="detail-label">Active Jobs</span>
            <span className="detail-value">{health.activeJobs}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Total Jobs</span>
            <span className="detail-value">{health.totalJobs}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Last Health Check</span>
            <span className="detail-value">
              {new Date(health.lastCheck).toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>

      {/* Refresh */}
      <div className="stagger-item" style={{ animationDelay: "250ms" }}>
        <button
          className="btn btn-ghost btn-block"
          onClick={() => {
            setLoading(true);
            fetchHealth()
              .then(setHealth)
              .finally(() => setLoading(false));
          }}
          id="refresh-health"
        >
          <Icon name="refresh" size={14} /> Refresh Health
        </button>
      </div>
    </div>
  );
}
