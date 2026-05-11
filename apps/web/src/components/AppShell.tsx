import { NavLink } from "react-router-dom";
import { Icon } from "./Icon.js";
import { useTheme } from "./ThemeProvider.js";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="app-shell">
      {/* Desktop Sidebar */}
      <aside className="app-sidebar">
        <div className="sidebar-logo">
          <div className="app-logo-icon">
            <Icon name="zap" size={16} />
          </div>
          <span className="app-logo-text">Agentic Dispatch</span>
        </div>

        <nav className="sidebar-nav">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `sidebar-item${isActive ? " active" : ""}`}
          >
            <Icon name="jobs" size={18} />
            Jobs
          </NavLink>
          <NavLink
            to="/new"
            className={({ isActive }) => `sidebar-item${isActive ? " active" : ""}`}
          >
            <Icon name="new-job" size={18} />
            New Job
          </NavLink>
          <NavLink
            to="/github"
            className={({ isActive }) => `sidebar-item${isActive ? " active" : ""}`}
          >
            <Icon name="github" size={18} />
            GitHub
          </NavLink>
          <NavLink
            to="/health"
            className={({ isActive }) => `sidebar-item${isActive ? " active" : ""}`}
          >
            <Icon name="health" size={18} />
            Health
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            <Icon name={theme === "dark" ? "sun" : "moon"} size={16} />
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="app-header">
        <div className="app-header-inner">
          <div className="app-logo">
            <div className="app-logo-icon">
              <Icon name="zap" size={16} />
            </div>
            <span className="app-logo-text">Agentic Dispatch</span>
          </div>
          <div className="app-header-actions">
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              <Icon name={theme === "dark" ? "sun" : "moon"} size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="app-main-area">
        <main className="app-content">{children}</main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="bottom-nav" id="main-nav">
        <div className="bottom-nav-inner">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
            id="nav-jobs"
          >
            <span className="nav-icon"><Icon name="jobs" size={20} /></span>
            Jobs
          </NavLink>
          <NavLink
            to="/new"
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
            id="nav-new"
          >
            <span className="nav-icon"><Icon name="new-job" size={20} /></span>
            New
          </NavLink>
          <NavLink
            to="/github"
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
            id="nav-github"
          >
            <span className="nav-icon"><Icon name="github" size={20} /></span>
            GitHub
          </NavLink>
          <NavLink
            to="/health"
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
            id="nav-health"
          >
            <span className="nav-icon"><Icon name="health" size={20} /></span>
            Health
          </NavLink>
        </div>
      </nav>
    </div>
  );
}
