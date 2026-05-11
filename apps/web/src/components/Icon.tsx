/**
 * Inline SVG icon system.
 * Replaces all emoji usage with clean, professional vector icons.
 */

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export type IconName =
  | "jobs"
  | "new-job"
  | "github"
  | "health"
  | "repo"
  | "branch"
  | "pr"
  | "thread"
  | "clock"
  | "arrow-left"
  | "refresh"
  | "cancel"
  | "rocket"
  | "terminal"
  | "lock"
  | "org"
  | "user"
  | "check"
  | "warning"
  | "error"
  | "loading"
  | "sun"
  | "moon"
  | "chevron-down"
  | "chevron-right"
  | "inbox-empty"
  | "search"
  | "external-link"
  | "zap"
  | "shield"
  | "activity"
  | "server"
  | "database"
  | "code";

const PATHS: Record<IconName, string> = {
  jobs: "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9 2 2 4-4",
  "new-job": "M12 5v14m-7-7h14",
  github: "M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.866-.013-1.7-2.782.603-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.6 9.6 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z",
  health: "M22 12h-4l-3 9L9 3l-3 9H2",
  repo: "M3 7V5a2 2 0 0 1 2-2h6l2 2h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2",
  branch: "M6 3v12M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm12-8a9 9 0 0 1-9 9",
  pr: "M18 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 0v12m12-6V9a2 2 0 0 0-2-2h-4l-3 3",
  thread: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  clock: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm0-14v4l3 3",
  "arrow-left": "M19 12H5m7-7-7 7 7 7",
  refresh: "M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15",
  cancel: "M18 6 6 18M6 6l12 12",
  rocket: "M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zM12 15l-3-3m3 3a22 22 0 0 0 4.3-5.8C17.3 3.2 12 2 12 2S6.7 3.2 6.7 9.2A22 22 0 0 0 9 15m3 0v4.8a1.2 1.2 0 0 1-.6 1l-3 1.7M9 15H4.2a1.2 1.2 0 0 1-1-.6L1.5 11.4",
  terminal: "M4 17l6-6-6-6m8 14h8",
  lock: "M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2zm-2 0V7A5 5 0 0 0 7 7v4",
  org: "M3 21h18M9 8h1M9 12h1M9 16h1M14 8h1M14 12h1M14 16h1M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16",
  user: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m8-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  check: "M20 6 9 17l-5-5",
  warning: "M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4m0 4h.01",
  error: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zm0-14v4m0 4h.01",
  loading: "M12 2v4m0 12v4m10-10h-4M6 12H2m15.07-5.07-2.83 2.83M9.76 14.24l-2.83 2.83m11.14 0-2.83-2.83M9.76 9.76 6.93 6.93",
  sun: "M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0-12v2m0 16v2m-8-10H2m20 0h-2m-2.05-6.36-1.41 1.41M7.46 16.54l-1.41 1.41m0-11.32 1.41 1.41m9.18 9.18 1.41 1.41",
  moon: "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z",
  "chevron-down": "M6 9l6 6 6-6",
  "chevron-right": "M9 18l6-6-6-6",
  "inbox-empty": "M22 12h-6l-2 3h-4l-2-3H2m4.61-5.93L3 12v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6l-3.61-5.93A2 2 0 0 0 15.68 5H8.32a2 2 0 0 0-1.71.93z",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm10 2-4.35-4.35",
  "external-link": "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6m4-3h6v6m-11 5L21 3",
  zap: "M13 2 3 14h9l-1 8 10-12h-9l1-8z",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  activity: "M22 12h-4l-3 9L9 3l-3 9H2",
  server: "M2 5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5zm0 10a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4zm4-8h.01M6 17h.01",
  database: "M12 2C8 2 4 3.5 4 5.5v13C4 20.5 8 22 12 22s8-1.5 8-3.5v-13C20 3.5 16 2 12 2zM4 12c0 2 4 3.5 8 3.5s8-1.5 8-3.5M4 5.5C4 7.5 8 9 12 9s8-1.5 8-3.5",
  code: "M16 18l6-6-6-6M8 6l-6 6 6 6",
};

export function Icon({ name, size = 20, className, style }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
