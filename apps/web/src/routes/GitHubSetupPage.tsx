import { useState, useEffect } from "react";
import { fetchInstallations, syncInstallations } from "../api/client.js";
import type { GitHubInstallation } from "../api/client.js";
import { Icon } from "../components/Icon.js";

export function GitHubSetupPage() {
  const [installations, setInstallations] = useState<GitHubInstallation[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchInstallations()
      .then(setInstallations)
      .finally(() => setLoading(false));
  }, []);

  async function handleSync() {
    setSyncing(true);
    await syncInstallations();
    const updated = await fetchInstallations();
    setInstallations(updated);
    setSyncing(false);
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title" id="page-title-github">GitHub</h1>
        <p className="page-subtitle">Manage GitHub App installations</p>
      </div>

      {/* Info Card */}
      <div className="card setup-card stagger-item" style={{ animationDelay: "0ms", marginBottom: "var(--space-md)" }}>
        <div className="setup-card-icon">
          <Icon name="github" size={40} />
        </div>
        <div className="setup-card-title">GitHub App</div>
        <div className="setup-card-desc">
          Agentic Dispatch uses a GitHub App to clone repositories, create branches,
          and open pull requests on your behalf.
        </div>
        <button
          className="btn btn-primary"
          onClick={handleSync}
          disabled={syncing}
          id="sync-installations"
        >
          {syncing ? (
            <>
              <span className="spinner"><Icon name="loading" size={14} /></span>
              Syncing…
            </>
          ) : (
            <>
              <Icon name="refresh" size={14} /> Sync Installations
            </>
          )}
        </button>
      </div>

      {/* Installations List */}
      <div className="detail-section stagger-item" style={{ animationDelay: "80ms" }}>
        <div className="detail-section-title">Installations</div>

        {loading ? (
          <div className="card" style={{ padding: "var(--space-lg)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
              <div className="skeleton" style={{ width: "100%", height: 48 }} />
              <div className="skeleton" style={{ width: "100%", height: 48 }} />
            </div>
          </div>
        ) : installations.length === 0 ? (
          <div className="card">
            <div className="empty-state" style={{ padding: "var(--space-lg)" }}>
              <div className="empty-state-icon">
                <Icon name="lock" size={40} />
              </div>
              <div className="empty-state-title">No installations</div>
              <div className="empty-state-desc">
                Install the GitHub App on your account or organization to get started.
              </div>
            </div>
          </div>
        ) : (
          <div className="card" style={{ padding: 0 }}>
            {installations.map((inst) => (
              <div key={inst.installationId} className="installation-item">
                <div className="installation-info">
                  <div className="installation-avatar">
                    <Icon
                      name={inst.accountType === "Organization" ? "org" : "user"}
                      size={18}
                    />
                  </div>
                  <div>
                    <div className="installation-name">{inst.ownerLogin}</div>
                    <div className="installation-type">{inst.accountType}</div>
                  </div>
                </div>
                <span className="status-badge status-badge--completed">
                  <span className="status-dot" />
                  Active
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
