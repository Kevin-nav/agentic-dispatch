import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./components/ThemeProvider.js";
import { AppShell } from "./components/AppShell.js";
import { JobsPage } from "./routes/JobsPage.js";
import { NewJobPage } from "./routes/NewJobPage.js";
import { JobDetailPage } from "./routes/JobDetailPage.js";
import { GitHubSetupPage } from "./routes/GitHubSetupPage.js";
import { HealthPage } from "./routes/HealthPage.js";

export function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<JobsPage />} />
            <Route path="/new" element={<NewJobPage />} />
            <Route path="/jobs/:jobId" element={<JobDetailPage />} />
            <Route path="/github" element={<GitHubSetupPage />} />
            <Route path="/health" element={<HealthPage />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </ThemeProvider>
  );
}
