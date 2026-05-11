import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createJob, fetchRepos } from "../api/client.js";
import { Icon } from "../components/Icon.js";

export function NewJobPage() {
  const [repos, setRepos] = useState<string[]>([]);
  const [repoFullName, setRepoFullName] = useState("");
  const [baseBranch, setBaseBranch] = useState("main");
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<"async_pr" | "interactive">("async_pr");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRepos().then(setRepos);
  }, []);

  const canSubmit = repoFullName && prompt.trim().length > 10 && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const job = await createJob({ repoFullName, baseBranch, prompt, mode });
      navigate(`/jobs/${job.id}`);
    } catch {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title" id="page-title-new">New Job</h1>
        <p className="page-subtitle">Dispatch an autonomous development task</p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Mode */}
        <div className="form-group stagger-item" style={{ animationDelay: "0ms" }}>
          <label className="form-label">Mode</label>
          <div className="mode-selector">
            <div
              className={`mode-option${mode === "async_pr" ? " selected" : ""}`}
              onClick={() => setMode("async_pr")}
              id="mode-async-pr"
            >
              <div className="mode-option-icon">
                <Icon name="rocket" size={22} />
              </div>
              <div className="mode-option-label">Async PR</div>
              <div className="mode-option-desc">Autonomous pull request</div>
            </div>
            <div
              className={`mode-option${mode === "interactive" ? " selected" : ""}`}
              onClick={() => setMode("interactive")}
              id="mode-interactive"
            >
              <div className="mode-option-icon">
                <Icon name="terminal" size={22} />
              </div>
              <div className="mode-option-label">Interactive</div>
              <div className="mode-option-desc">T3 session with prompts</div>
            </div>
          </div>
        </div>

        {/* Repository */}
        <div className="form-group stagger-item" style={{ animationDelay: "50ms" }}>
          <label className="form-label" htmlFor="repo-select">Repository</label>
          <select
            id="repo-select"
            className="form-select"
            value={repoFullName}
            onChange={(e) => setRepoFullName(e.target.value)}
          >
            <option value="">Select a repository…</option>
            {repos.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {/* Base Branch */}
        <div className="form-group stagger-item" style={{ animationDelay: "100ms" }}>
          <label className="form-label" htmlFor="branch-input">Base Branch</label>
          <input
            id="branch-input"
            className="form-input"
            type="text"
            value={baseBranch}
            onChange={(e) => setBaseBranch(e.target.value)}
            placeholder="main"
          />
        </div>

        {/* Prompt */}
        <div className="form-group stagger-item" style={{ animationDelay: "150ms" }}>
          <label className="form-label" htmlFor="prompt-input">Task Prompt</label>
          <textarea
            id="prompt-input"
            className="form-textarea"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the development task in detail. The agent will implement changes, run checks, and open a PR."
            rows={5}
          />
        </div>

        {/* Submit */}
        <div className="stagger-item" style={{ animationDelay: "200ms" }}>
          <button
            type="submit"
            className="btn btn-primary btn-block btn-lg"
            disabled={!canSubmit}
            id="submit-job"
          >
            {submitting ? (
              <>
                <span className="spinner"><Icon name="loading" size={16} /></span>
                Dispatching…
              </>
            ) : (
              <>
                <Icon name="zap" size={16} />
                Dispatch Job
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
