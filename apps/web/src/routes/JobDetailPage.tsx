import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { cancelJob } from "../api/client.js";
import { useJobData, useJobEventsData, useT3SessionUrl } from "../api/realtime.js";
import type { JobEventRecord, JobRecord } from "../api/types.js";
import { Icon } from "../components/Icon.js";
import { StatusBadge } from "../components/StatusBadge.js";

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

const terminalStatuses = ["completed", "failed", "cancelled", "timed_out"];

function currentStep(job: JobRecord, events: JobEventRecord[]): string {
  const latest = events.at(-1);
  if (job.failureReason) return job.failureReason;
  if (latest?.message) return latest.message;
  if (job.status === "queued") return "Waiting for dispatcher";
  if (job.status === "preparing_workspace") return "Preparing workspace";
  if (job.status === "registered_in_t3") return "T3 session ready";
  if (job.status === "running_in_t3") return "T3 is running";
  if (job.status === "completed") return "Job completed";
  return job.status.replaceAll("_", " ");
}

function metadataEntries(metadata: Record<string, unknown> | undefined) {
  if (!metadata) return [];
  return Object.entries(metadata).filter(([, value]) => {
    if (value === undefined || value === null) return false;
    return typeof value !== "object";
  });
}

export function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { data: job, loading: jobLoading, mode } = useJobData(jobId);
  const { data: events, loading: eventsLoading } = useJobEventsData(jobId);
  const t3SessionUrl = useT3SessionUrl(job);
  const [cancelling, setCancelling] = useState(false);

  const prLinks = useMemo(
    () => job?.pullRequests?.map((pullRequest) => pullRequest.url) ?? (job?.prUrl ? [job.prUrl] : []),
    [job],
  );

  async function handleCancel() {
    if (!job || cancelling) return;
    setCancelling(true);
    try {
      await cancelJob(job.id);
    } finally {
      setCancelling(false);
    }
  }

  if (jobLoading || eventsLoading) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">
          <span className="spinner"><Icon name="loading" size={32} /></span>
        </div>
        <div className="empty-state-title">Loading...</div>
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

  const isTerminal = terminalStatuses.includes(job.status);

  return (
    <div>
      <button className="back-btn" onClick={() => navigate("/")} id="back-to-jobs">
        <Icon name="arrow-left" size={14} /> Back
      </button>

      <div className="page-header page-header--compact">
        <p className="page-subtitle">
          <span className={`live-indicator live-indicator--${mode}`}>
            <span className="live-indicator-dot" />
            {mode === "realtime" ? "Live via Convex" : "HTTP fallback"}
          </span>
        </p>
      </div>

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

        <div className="job-state-callout">
          <div>
            <div className="job-state-callout-label">Current step</div>
            <div className="job-state-callout-value">{currentStep(job, events)}</div>
          </div>
          {t3SessionUrl && (
            <a
              href={t3SessionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              <Icon name="external-link" size={14} /> Open in T3
            </a>
          )}
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
        {t3SessionUrl && (
          <div className="detail-row">
            <span className="detail-label">T3 Session</span>
            <a
              href={t3SessionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="detail-value detail-link"
            >
              <Icon name="external-link" size={12} /> Open in T3
            </a>
          </div>
        )}
        {job.t3ThreadId && (
          <div className="detail-row">
            <span className="detail-label">T3 Thread</span>
            <span className="detail-value detail-link">
              <Icon name="thread" size={12} /> {job.t3ThreadId}
            </span>
          </div>
        )}
        {prLinks.map((url, index) => (
          <div className="detail-row" key={url}>
            <span className="detail-label">
              Pull Request{prLinks.length > 1 ? ` ${index + 1}` : ""}
            </span>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="detail-value detail-link"
            >
              <Icon name="external-link" size={12} /> View PR
            </a>
          </div>
        ))}
        {job.failureReason && (
          <div className="detail-row">
            <span className="detail-label">Error</span>
            <span className="detail-value" style={{ color: "var(--status-failed)" }}>
              {job.failureReason}
            </span>
          </div>
        )}
      </div>

      <div className="detail-section stagger-item" style={{ animationDelay: "80ms" }}>
        <div className="detail-section-title">Task Prompt</div>
        <div className="prompt-display">{job.prompt}</div>
      </div>

      {events.length > 0 && (
        <div className="detail-section stagger-item" style={{ animationDelay: "160ms" }}>
          <div className="detail-section-title">Event Timeline</div>
          <div className="timeline">
            {events.map((event, index) => {
              const isLast = index === events.length - 1;
              let dotClass = "timeline-dot";
              if (isLast && !isTerminal) dotClass += " timeline-dot--active";
              else if (
                event.type.includes("pull_request") ||
                event.message.toLowerCase().includes("completed")
              ) {
                dotClass += " timeline-dot--completed";
              } else if (
                event.type.includes("failed") ||
                event.message.toLowerCase().includes("failed")
              ) {
                dotClass += " timeline-dot--failed";
              }
              const meta = metadataEntries(event.metadata);

              return (
                <div key={event.id} className="timeline-item">
                  <div className={dotClass} />
                  <div className="timeline-message">{event.message}</div>
                  {meta.length > 0 && (
                    <div className="timeline-meta">
                      {meta.map(([key, value]) => (
                        <span key={key} className="timeline-meta-item">
                          {key}: {String(value)}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="timeline-time">{formatTime(event.createdAt)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
                Cancelling...
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
