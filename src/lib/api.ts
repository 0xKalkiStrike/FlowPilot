import { Workflow, Execution, Credential, BrowserProfile, Schedule, Template } from '../types/workflow.js';

const API_BASE = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {})
    },
    ...options
  });
  const data = await res.json();
  if (!res.ok || data.success === false) {
    throw new Error(data.error || `HTTP ${res.status}: ${res.statusText}`);
  }
  return data.data !== undefined ? data.data : data;
}

export const api = {
  // Workflows
  getWorkflows: () => fetchJson<Workflow[]>(`${API_BASE}/workflows`),
  getWorkflow: (id: string) => fetchJson<Workflow>(`${API_BASE}/workflows/${id}`),
  createWorkflow: (data: Partial<Workflow>) => fetchJson<Workflow>(`${API_BASE}/workflows`, { method: 'POST', body: JSON.stringify(data) }),
  updateWorkflow: (id: string, data: Partial<Workflow>) => fetchJson<Workflow>(`${API_BASE}/workflows/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteWorkflow: (id: string) => fetchJson<{ message: string }>(`${API_BASE}/workflows/${id}`, { method: 'DELETE' }),
  duplicateWorkflow: (id: string) => fetchJson<{ id: string; name: string }>(`${API_BASE}/workflows/${id}/duplicate`, { method: 'POST' }),
  importWorkflow: (data: any) => fetchJson<Workflow>(`${API_BASE}/workflows/import`, { method: 'POST', body: JSON.stringify(data) }),
  getExportUrl: (id: string) => `${API_BASE}/workflows/${id}/export`,
  testNode: (nodeType: string, nodeData: any, variables?: Record<string, any>) =>
    fetchJson<{ success: boolean; output?: any; nextHandle?: string; error?: string; variables?: Record<string, any>; logs?: any[]; duration?: number }>(
      `${API_BASE}/workflows/test-node`,
      { method: 'POST', body: JSON.stringify({ nodeType, nodeData, variables }) }
    ),

  // Executions
  runWorkflow: (id: string, options?: { profileId?: string; headless?: boolean; slowMo?: number; initialVariables?: Record<string, any> }) =>
    fetchJson<{ executionId: string; status: string }>(`${API_BASE}/executions/workflow/${id}/run`, { method: 'POST', body: JSON.stringify(options || {}) }),
  getExecutions: (params?: { workflowId?: string; status?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.workflowId) q.append('workflowId', params.workflowId);
    if (params?.status) q.append('status', params.status);
    if (params?.limit) q.append('limit', String(params.limit));
    return fetchJson<Execution[]>(`${API_BASE}/executions?${q.toString()}`);
  },
  getExecution: (id: string) => fetchJson<Execution>(`${API_BASE}/executions/${id}`),
  cancelExecution: (id: string) => fetchJson<{ message: string }>(`${API_BASE}/executions/${id}/cancel`, { method: 'POST' }),
  resumeExecution: (id: string) => fetchJson<{ message: string }>(`${API_BASE}/executions/${id}/resume`, { method: 'POST' }),

  // Credentials
  getCredentials: () => fetchJson<Credential[]>(`${API_BASE}/credentials`),
  createCredential: (data: { name: string; type: string; username_or_key?: string; secret: string; metadata?: any }) =>
    fetchJson<Credential>(`${API_BASE}/credentials`, { method: 'POST', body: JSON.stringify(data) }),
  updateCredential: (id: string, data: any) =>
    fetchJson<Credential>(`${API_BASE}/credentials/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCredential: (id: string) => fetchJson<{ message: string }>(`${API_BASE}/credentials/${id}`, { method: 'DELETE' }),

  // Profiles
  getProfiles: () => fetchJson<BrowserProfile[]>(`${API_BASE}/profiles`),
  createProfile: (name: string, userAgent?: string) =>
    fetchJson<BrowserProfile>(`${API_BASE}/profiles`, { method: 'POST', body: JSON.stringify({ name, userAgent }) }),
  clearProfileSession: (id: string) =>
    fetchJson<{ message: string }>(`${API_BASE}/profiles/${id}/clear`, { method: 'POST' }),
  deleteProfile: (id: string) =>
    fetchJson<{ message: string }>(`${API_BASE}/profiles/${id}`, { method: 'DELETE' }),

  // Schedules
  getSchedules: () => fetchJson<Schedule[]>(`${API_BASE}/schedules`),
  createSchedule: (data: any) => fetchJson<Schedule>(`${API_BASE}/schedules`, { method: 'POST', body: JSON.stringify(data) }),
  toggleSchedule: (id: string, is_enabled: boolean) =>
    fetchJson<Schedule>(`${API_BASE}/schedules/${id}/toggle`, { method: 'PATCH', body: JSON.stringify({ is_enabled }) }),
  triggerScheduleNow: (id: string) => fetchJson<{ executionId: string }>(`${API_BASE}/schedules/${id}/run`, { method: 'POST' }),
  deleteSchedule: (id: string) => fetchJson<{ message: string }>(`${API_BASE}/schedules/${id}`, { method: 'DELETE' }),

  // Templates
  getTemplates: () => fetchJson<Template[]>(`${API_BASE}/templates`),
  cloneTemplate: (id: string) => fetchJson<{ id: string; name: string }>(`${API_BASE}/templates/${id}/clone`, { method: 'POST' }),

  // Recorder
  startRecording: (url: string, profileId?: string) =>
    fetchJson<{ recordingId: string }>(`${API_BASE}/recorder/start`, { method: 'POST', body: JSON.stringify({ url, profileId }) }),
  stopRecording: (recordingId: string) =>
    fetchJson<{ nodes: any[]; edges: any[] }>(`${API_BASE}/recorder/stop`, { method: 'POST', body: JSON.stringify({ recordingId }) }),

  // Stats & Search
  getDashboardStats: () => fetchJson<any>(`${API_BASE}/stats/dashboard`),
  globalSearch: (q: string) => fetchJson<any>(`${API_BASE}/stats/search?q=${encodeURIComponent(q)}`)
};
