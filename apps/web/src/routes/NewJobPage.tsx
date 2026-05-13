import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { createJob, fetchRepos, type InstallationRepo } from "../api/client.js";
import type { JobRepoRole } from "../api/types.js";
import { Icon } from "../components/Icon.js";

interface SelectedRepo {
  owner: string;
  repo: string;
  fullName: string;
  role: JobRepoRole;
  baseBranch: string;
}

export function NewJobPage() {
  const [repos, setRepos] = useState<InstallationRepo[]>([]);
  const [repoFullName, setRepoFullName] = useState("");
  const [selectedRepos, setSelectedRepos] = useState<SelectedRepo[]>([]);
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<"async_pr" | "interactive">("async_pr");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRepos().then(setRepos);
  }, []);

  const selectedKeys = useMemo(
    () => new Set(selectedRepos.map((repo) => repo.fullName.toLowerCase())),
    [selectedRepos],
  );
  const availableRepos = repos.filter((repo) => !selectedKeys.has(repo.fullName.toLowerCase()));
  const editableCount = selectedRepos.filter((repo) => repo.role === "editable").length;
  const hasMissingBranch = selectedRepos.some((repo) => !repo.baseBranch.trim());
  const validationMessage =
    selectedRepos.length === 0
      ? "Select at least one repository."
      : mode === "async_pr" && editableCount === 0
        ? "Async PR jobs need at least one editable repository."
        : hasMissingBranch
          ? "Every selected repository needs a base branch."
          : prompt.trim().length <= 10
            ? "Describe the task in more detail."
            : undefined;
  const canSubmit = !validationMessage && !submitting;

  function addSelectedRepo() {
    const repo = repos.find((candidate) => candidate.fullName === repoFullName);
    if (!repo) return;
    setSelectedRepos((current) => [
      ...current,
      {
        owner: repo.owner,
        repo: repo.repo,
        fullName: repo.fullName,
        role: current.length === 0 ? "editable" : "context",
        baseBranch: repo.defaultBranch || "main",
      },
    ]);
    setRepoFullName("");
  }

  function updateSelectedRepo(fullName: string, patch: Partial<SelectedRepo>) {
    setSelectedRepos((current) =>
      current.map((repo) => (repo.fullName === fullName ? { ...repo, ...patch } : repo)),
    );
  }

  function removeSelectedRepo(fullName: string) {
    setSelectedRepos((current) => current.filter((repo) => repo.fullName !== fullName));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    const primaryRepo = selectedRepos.find((repo) => repo.role === "editable") ?? selectedRepos[0];
    if (!primaryRepo) return;

    setSubmitting(true);
    try {
      const job = await createJob({
        repoFullName: primaryRepo.fullName,
        baseBranch: primaryRepo.baseBranch,
        prompt,
        mode,
        repos: selectedRepos.map((repo) => ({
          owner: repo.owner,
          repo: repo.repo,
          fullName: repo.fullName,
          role: repo.role,
          baseBranch: repo.baseBranch,
        })),
      });
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
        <div className="form-group stagger-item" style={{ animationDelay: "0ms" }}>
          <label className="form-label">Mode</label>
          <div className="mode-selector">
            <button
              type="button"
              className={`mode-option${mode === "async_pr" ? " selected" : ""}`}
              onClick={() => setMode("async_pr")}
              id="mode-async-pr"
            >
              <div className="mode-option-icon">
                <Icon name="rocket" size={22} />
              </div>
              <div className="mode-option-label">Async PR</div>
              <div className="mode-option-desc">Autonomous pull request</div>
            </button>
            <button
              type="button"
              className={`mode-option${mode === "interactive" ? " selected" : ""}`}
              onClick={() => setMode("interactive")}
              id="mode-interactive"
            >
              <div className="mode-option-icon">
                <Icon name="terminal" size={22} />
              </div>
              <div className="mode-option-label">Interactive</div>
              <div className="mode-option-desc">T3 session with prompts</div>
            </button>
          </div>
        </div>

        <div className="form-group stagger-item" style={{ animationDelay: "50ms" }}>
          <label className="form-label" htmlFor="repo-select">Repositories</label>
          <div className="repo-picker">
            <select
              id="repo-select"
              className="form-select"
              value={repoFullName}
              onChange={(e) => setRepoFullName(e.target.value)}
            >
              <option value="">Select a repository...</option>
              {availableRepos.map((repo) => (
                <option key={repo.fullName} value={repo.fullName}>
                  {repo.fullName}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={!repoFullName}
              onClick={addSelectedRepo}
            >
              <Icon name="new-job" size={14} /> Add
            </button>
          </div>
        </div>

        {selectedRepos.length > 0 && (
          <div className="selected-repo-list stagger-item" style={{ animationDelay: "100ms" }}>
            {selectedRepos.map((repo) => (
              <div key={repo.fullName} className="selected-repo-item">
                <div className="selected-repo-main">
                  <div className="selected-repo-name">
                    <Icon name="repo" size={15} /> {repo.fullName}
                  </div>
                  <div className="selected-repo-controls">
                    <div className="role-toggle" aria-label={`Role for ${repo.fullName}`}>
                      <button
                        type="button"
                        className={repo.role === "editable" ? "selected" : ""}
                        onClick={() => updateSelectedRepo(repo.fullName, { role: "editable" })}
                      >
                        Editable
                      </button>
                      <button
                        type="button"
                        className={repo.role === "context" ? "selected" : ""}
                        onClick={() => updateSelectedRepo(repo.fullName, { role: "context" })}
                      >
                        Context
                      </button>
                    </div>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Remove ${repo.fullName}`}
                      onClick={() => removeSelectedRepo(repo.fullName)}
                    >
                      <Icon name="cancel" size={14} />
                    </button>
                  </div>
                </div>
                <label className="branch-field">
                  <span>Base branch</span>
                  <input
                    className="form-input"
                    type="text"
                    value={repo.baseBranch}
                    onChange={(e) =>
                      updateSelectedRepo(repo.fullName, { baseBranch: e.target.value })
                    }
                    placeholder="main"
                  />
                </label>
              </div>
            ))}
          </div>
        )}

        <div className="form-group stagger-item" style={{ animationDelay: "150ms" }}>
          <label className="form-label" htmlFor="prompt-input">Task Prompt</label>
          <textarea
            id="prompt-input"
            className="form-textarea"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the development task in detail. Editable repositories can be changed; context repositories are read-only guidance."
            rows={5}
          />
        </div>

        {validationMessage && <div className="form-hint">{validationMessage}</div>}

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
                Dispatching...
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
