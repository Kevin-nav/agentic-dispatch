import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchJobs } from "../api/client.js";
import type { JobRecord } from "../api/types.js";
import { StatusBadge } from "../components/StatusBadge.js";
import { Icon } from "../components/Icon.js";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
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
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchJobs()
      .then(setJobs)
      .finally(() => setLoading(false));
  }, []);

  const activeCount = jobs.filter(
    (j) => !["completed", "failed", "cancelled", "timed_out"].includes(j.status),
  ).length;
  const completedCount = jobs.filter((j) => j.status === "completed").length;
  const failedCount = jobs.filter((j) => j.status === "failed").length;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title" id="page-title-jobs">Jobs</h1>
        <p className="page-subtitle">Autonomous task dispatch overview</p>
      </div>

      {/* Stats */}
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
          {jobs.map((job, i) => (
            <div
              key={job.id}
              className="card card-interactive job-card stagger-item"
              style={{ animationDelay: `${200 + i * 60}ms` }}
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

              <div className="job-card-footer">
                <span className="job-card-time">
                  <Icon name="clock" size={12} />
                  {timeAgo(job.createdAt)}
                </span>
                <div className="job-card-links">
                  {job.prUrl && (
                    <a
                      href={job.prUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="job-card-link"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Icon name="pr" size={12} /> PR
                    </a>
                  )}
                  {job.t3ThreadId && (
                    <span className="job-card-link">
                      <Icon name="thread" size={12} /> T3
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
