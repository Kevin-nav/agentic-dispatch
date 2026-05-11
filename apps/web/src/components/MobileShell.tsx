import { NavLink } from "react-router-dom";

export function MobileShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <div className="app-logo">
            <div className="app-logo-icon">⚡</div>
            <span className="app-logo-text">Agentic Dispatch</span>
          </div>
          <span className="app-header-badge">Private</span>
        </div>
      </header>

      <main className="app-content">{children}</main>

      <nav className="bottom-nav" id="main-nav">
        <div className="bottom-nav-inner">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
            id="nav-jobs"
          >
            <span className="nav-icon">📋</span>
            Jobs
          </NavLink>
          <NavLink
            to="/new"
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
            id="nav-new"
          >
            <span className="nav-icon">✨</span>
            New
          </NavLink>
          <NavLink
            to="/github"
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
            id="nav-github"
          >
            <span className="nav-icon">🔗</span>
            GitHub
          </NavLink>
          <NavLink
            to="/health"
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
            id="nav-health"
          >
            <span className="nav-icon">💚</span>
            Health
          </NavLink>
        </div>
      </nav>
    </div>
  );
}
