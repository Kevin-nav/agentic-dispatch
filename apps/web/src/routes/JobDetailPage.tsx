import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchJob, fetchJobEvents, cancelJob } from "../api/client.js";
import type { JobRecord, JobEventRecord } from "../api/types.js";
import { StatusBadge } from "../components/StatusBadge.js";
import { Icon } from "../components/Icon.js";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const TERMINAL_STATUSES = ["completed", "failed", "cancelled", "timed_out"];

export function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<JobRecord | null>(null);
  const [events, setEvents] = useState<JobEventRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!jobId) return;
    Promise.all([fetchJob(jobId), fetchJobEvents(jobId)])
      .then(([j, e]) => {
        setJob(j);
        setEvents(e);
      })
      .finally(() => setLoading(false));
  }, [jobId]);

  async function handleCancel() {
    if (!job || cancelling) return;
    setCancelling(true);
    await cancelJob(job.id);
    setJob((prev) => prev ? { ...prev, status: "cancelled", updatedAt: new Date().toISOString() } : null);
    setCancelling(false);
  }

  if (loading) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <span className="spinner"><Icon name="loading" size={32} /></span>
        </div>
        <div className="empty-state-title">Loading…</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <Icon name="search" size={48} />
        </div>
        <div className="empty-state-title">Job not found</div>
        <button className="btn btn-ghost" onClick={() => navigate("/")}>
          <Icon name="arrow-left" size={14} /> Back to Jobs
        </button>
      </div>
    );
  }

  const isTerminal = TERMINAL_STATUSES.includes(job.status);

  return (
    <div>
      <button className="back-btn" onClick={() => navigate("/")} id="back-to-jobs">
        <Icon name="arrow-left" size={14} /> Back
      </button>

      {/* Header */}
      <div className="card stagger-item" style={{ animationDelay: "0ms", marginBottom: "var(--space-md)" }}>
        <div className="job-card-header" style={{ marginBottom: "var(--space-sm)" }}>
          <div className="job-card-repo">
            <span className="job-card-repo-icon">
              <Icon name="repo" size={16} />
            </span>
            {job.repoOwner}/{job.repoName}
          </div>
          <StatusBadge status={job.status} />
        </div>

        <div className="detail-row">
          <span className="detail-label">Job ID</span>
          <span className="detail-value">{job.id}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Base Branch</span>
          <span className="detail-value">{job.baseBranch}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Work Branch</span>
          <span className="detail-value">{job.workBranch}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Mode</span>
          <span className="detail-value">
            {job.mode === "interactive_t3" ? "Interactive T3" : "Async PR"}
          </span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Created</span>
          <span className="detail-value">{timeAgo(job.createdAt)}</span>
        </div>
        {job.t3SessionUrl && (
          <div className="detail-row">
            <span className="detail-label">T3 Session</span>
            <a
              href={job.t3SessionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="detail-value"
              style={{ color: "var(--accent)", display: "flex", alignItems: "center", gap: 4 }}
            >
              <Icon name="external-link" size={12} /> Open in T3
            </a>
          </div>
        )}
        {job.t3ThreadId && (
          <div className="detail-row">
            <span className="detail-label">T3 Thread</span>
            <span className="detail-value" style={{ color: "var(--accent)", display: "flex", alignItems: "center", gap: 4 }}>
              <Icon name="thread" size={12} /> {job.t3ThreadId}
            </span>
          </div>
        )}
        {job.prUrl && (
          <div className="detail-row">
            <span className="detail-label">Pull Request</span>
            <a
              href={job.prUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="detail-value"
              style={{ color: "var(--accent)", display: "flex", alignItems: "center", gap: 4 }}
            >
              <Icon name="external-link" size={12} /> View PR
            </a>
          </div>
        )}
        {job.failureReason && (
          <div className="detail-row">
            <span className="detail-label">Error</span>
            <span className="detail-value" style={{ color: "var(--status-failed)" }}>
              {job.failureReason}
            </span>
          </div>
        )}
      </div>

      {/* Prompt */}
      <div className="detail-section stagger-item" style={{ animationDelay: "80ms" }}>
        <div className="detail-section-title">Task Prompt</div>
        <div className="prompt-display">{job.prompt}</div>
      </div>

      {/* Timeline */}
      {events.length > 0 && (
        <div className="detail-section stagger-item" style={{ animationDelay: "160ms" }}>
          <div className="detail-section-title">Event Timeline</div>
          <div className="timeline">
            {events.map((evt, i) => {
              const isLast = i === events.length - 1;
              let dotClass = "timeline-dot";
              if (isLast && !isTerminal) dotClass += " timeline-dot--active";
              else if (evt.type === "pr_created" || evt.type === "status_change" && evt.message.includes("completed")) dotClass += " timeline-dot--completed";
              else if (evt.type === "error") dotClass += " timeline-dot--failed";

              return (
                <div key={evt.id} className="timeline-item">
                  <div className={dotClass} />
                  <div className="timeline-message">{evt.message}</div>
                  <div className="timeline-time">{formatTime(evt.createdAt)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      {!isTerminal && (
        <div className="stagger-item" style={{ animationDelay: "240ms" }}>
          <button
            className="btn btn-danger btn-block"
            onClick={handleCancel}
            disabled={cancelling}
            id="cancel-job"
          >
            {cancelling ? (
              <>
                <span className="spinner"><Icon name="loading" size={14} /></span>
                Cancelling…
              </>
            ) : (
              <>
                <Icon name="cancel" size={14} /> Cancel Job
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
