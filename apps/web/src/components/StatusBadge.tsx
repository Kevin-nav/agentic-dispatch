import type { JobStatus } from "../api/types.js";

const STATUS_LABELS: Record<JobStatus, string> = {
  queued: "Queued",
  preparing_workspace: "Preparing",
  registered_in_t3: "Registered",
  running_in_t3: "Running",
  blocked: "Blocked",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
  timed_out: "Timed Out",
};

interface StatusBadgeProps {
  status: JobStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`status-badge status-badge--${status}`}>
      <span className="status-dot" />
      {STATUS_LABELS[status]}
    </span>
  );
}
