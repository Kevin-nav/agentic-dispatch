import { useNavigate } from "react-router-dom";

import { buildT3SessionUrl, useJobsData } from "../api/realtime.js";
import type { JobRecord } from "../api/types.js";
import { Icon } from "../components/Icon.js";
import { StatusBadge } from "../components/StatusBadge.js";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function currentStep(job: JobRecord): string {
  if (job.failureReason) return job.failureReason;
  if (job.status === "queued") return "Waiting for the dispatcher to start";
  if (job.status === "preparing_workspace") return "Preparing repository workspace";
  if (job.status === "registered_in_t3") return "T3 session is ready";
  if (job.status === "running_in_t3") return "T3 is working on the task";
  if (job.status === "blocked") return "Needs attention before it can continue";
  if (job.status === "completed") {
    return job.prUrl || job.pullRequests?.length ? "Completed with PR output" : "Completed";
  }
  if (job.status === "timed_out") return "Timed out while waiting for T3";
  if (job.status === "cancelled") return "Cancelled";
  return "Failed";
}

function JobCardSkeleton() {
  return (
    <div className="card job-card">
      <div className="job-card-header">
        <div className="skeleton" style={{ width: 160, height: 16 }} />
        <div className="skeleton" style={{ width: 70, height: 20, borderRadius: 999 }} />
      </div>
      <div className="skeleton" style={{ width: "100%", height: 14 }} />
      <div className="skeleton" style={{ width: "60%", height: 14 }} />
      <div className="job-card-footer">
        <div className="skeleton" style={{ width: 60, height: 12 }} />
      </div>
    </div>
  );
}

export function JobsPage() {
  const { data: jobs, loading, mode } = useJobsData();
  const navigate = useNavigate();

  const activeCount = jobs.filter(
    (job) => !["completed", "failed", "cancelled", "timed_out"].includes(job.status),
  ).length;
  const completedCount = jobs.filter((job) => job.status === "completed").length;
  const failedCount = jobs.filter((job) => job.status === "failed").length;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title" id="page-title-jobs">Jobs</h1>
        <p className="page-subtitle">
          Autonomous task dispatch overview
          <span className={`live-indicator live-indicator--${mode}`}>
            <span className="live-indicator-dot" />
            {mode === "realtime" ? "Live via Convex" : "HTTP fallback"}
          </span>
        </p>
      </div>

      <div className="stats-summary">
        <div className="stat-item stagger-item" style={{ animationDelay: "0ms" }}>
          <div className="stat-item-value stat-item-value--active">{activeCount}</div>
          <div className="stat-item-label">Active</div>
        </div>
        <div className="stat-item stagger-item" style={{ animationDelay: "50ms" }}>
          <div className="stat-item-value stat-item-value--done">{completedCount}</div>
          <div className="stat-item-label">Done</div>
        </div>
        <div className="stat-item stagger-item" style={{ animationDelay: "100ms" }}>
          <div className="stat-item-value stat-item-value--failed">{failedCount}</div>
          <div className="stat-item-label">Failed</div>
        </div>
        <div className="stat-item stagger-item" style={{ animationDelay: "150ms" }}>
          <div className="stat-item-value stat-item-value--total">{jobs.length}</div>
          <div className="stat-item-label">Total</div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
          <JobCardSkeleton />
          <JobCardSkeleton />
          <JobCardSkeleton />
        </div>
      ) : jobs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Icon name="inbox-empty" size={48} />
          </div>
          <div className="empty-state-title">No jobs yet</div>
          <div className="empty-state-desc">
            Dispatch your first autonomous task from the New tab.
          </div>
        </div>
      ) : (
        <div>
          {jobs.map((job, index) => {
            const t3Url = buildT3SessionUrl(job);
            const prUrl = job.pullRequests?.[0]?.url ?? job.prUrl;
            return (
              <div
                key={job.id}
                className="card card-interactive job-card stagger-item"
                style={{ animationDelay: `${200 + index * 60}ms` }}
                onClick={() => navigate(`/jobs/${job.id}`)}
                id={`job-card-${job.id}`}
              >
                <div className="job-card-header">
                  <div className="job-card-repo">
                    <span className="job-card-repo-icon">
                      <Icon name="repo" size={16} />
                    </span>
                    {job.repoOwner}/{job.repoName}
                  </div>
                  <StatusBadge status={job.status} />
                </div>

                <div className="job-card-prompt">{job.prompt}</div>
                <div className="job-card-step">{currentStep(job)}</div>

                <div className="job-card-footer">
                  <span className="job-card-time">
                    <Icon name="clock" size={12} />
                    {timeAgo(job.createdAt)}
                  </span>
                  <div className="job-card-links">
                    {prUrl && (
                      <a
                        href={prUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="job-card-link"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Icon name="pr" size={12} /> PR
                      </a>
                    )}
                    {t3Url && (
                      <a
                        href={t3Url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="job-card-link"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Icon name="external-link" size={12} /> T3
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
