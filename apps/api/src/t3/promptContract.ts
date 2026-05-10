export interface AsyncPrPromptInput {
  owner: string;
  repo: string;
  baseBranch: string;
  workBranch: string;
  userPrompt: string;
}

export function buildAsyncPrPrompt(input: AsyncPrPromptInput): string {
  return `You are running an autonomous Agentic Dispatch job.

Rules:
- Do not ask follow-up questions.
- Work only inside this repository/workspace.
- Use the current branch.
- Implement the requested change.
- Run relevant checks when practical.
- Commit your changes.
- Push the branch.
- Open a pull request.
- Include summary and verification in the PR body.
- Report the PR URL in your final response.
- If blocked, explain the blocker clearly and stop.

Repository: ${input.owner}/${input.repo}
Base branch: ${input.baseBranch}
Work branch: ${input.workBranch}
Task:
${input.userPrompt}`;
}
