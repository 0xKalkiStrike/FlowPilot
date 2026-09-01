import { Routes, Route, Navigate } from "react-router-dom";
import { AppLayout, BuilderLayout } from "./components/layout/AppLayout.js";
import { AuthGuard } from "./components/layout/AuthGuard.js";
import Login from "./pages/Login.js";
import Register from "./pages/Register.js";
import Dashboard from "./pages/Dashboard.js";
import Workflows from "./pages/Workflows.js";
import WorkflowEditor from "./pages/WorkflowEditor.js";
import Templates from "./pages/Templates.js";
import Credentials from "./pages/Credentials.js";
import Runs from "./pages/Runs.js";
import RunDetail from "./pages/RunDetail.js";
import Schedules from "./pages/Schedules.js";
import Settings from "./pages/Settings.js";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<AuthGuard />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/workflows" element={<Workflows />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/credentials" element={<Credentials />} />
          <Route path="/runs" element={<Runs />} />
          <Route path="/runs/:id" element={<RunDetail />} />
          <Route path="/schedules" element={<Schedules />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route element={<BuilderLayout />}>
          <Route path="/workflows/:id" element={<WorkflowEditor />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
