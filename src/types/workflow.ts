export interface SelectorStrategy {
  testId?: string;
  role?: string;
  roleName?: string;
  label?: string;
  placeholder?: string;
  text?: string;
  css?: string;
  xpath?: string;
  altText?: string;
  title?: string;
  fallbacks?: string[];
}

export interface NodeData {
  id?: string;
  type: string;
  label: string;
  title?: string;
  description?: string;
  icon?: string;
  category?: string;

  // Browser & URLs
  url?: string;
  timeout?: number;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
  duration?: number;
  direction?: 'down' | 'up' | 'bottom' | 'top';
  distance?: number;
  tabIndex?: number;

  // Selectors & Elements
  selector?: SelectorStrategy | string;
  targetSelector?: SelectorStrategy | string;
  sourceSelector?: SelectorStrategy | string;
  inputSelector?: SelectorStrategy | string;
  incrementSelector?: SelectorStrategy | string;
  decrementSelector?: SelectorStrategy | string;
  dropdownSelector?: SelectorStrategy | string;

  // Values & Variables
  text?: string;
  email?: string;
  password?: string;
  value?: any;
  values?: any[];
  checked?: boolean;
  clearFirst?: boolean;
  pressEnter?: boolean;
  delayMs?: number;
  key?: string;

  // Credentials
  credentialId?: string;

  // Quantity
  quantity?: number;
  strategy?: 'auto' | 'input' | 'buttons' | 'dropdown';
  minQuantity?: number;
  maxQuantity?: number;
  stepDelayMs?: number;

  // Extraction & Transforms
  variableName?: string;
  attribute?: string;
  input?: string;
  operation?: string;

  // Logic & Conditions
  conditionType?: 'variable' | 'elementExists' | 'elementVisible';
  leftValue?: string;
  operator?: string;
  rightValue?: string;
  cases?: string[];
  reason?: string;

  // Files
  filePath?: string;
  filename?: string;
  data?: any;

  // Services
  webhookUrl?: string;
  message?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: string;

  // Error handling & Retries
  retries?: number;
  continueOnError?: boolean;
}

export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: NodeData;
  selected?: boolean;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  animated?: boolean;
  label?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  trigger_type: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables: Record<string, any>;
  is_active: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface ExecutionLog {
  timestamp: string;
  nodeId?: string;
  nodeTitle?: string;
  message: string;
  level: 'info' | 'warn' | 'error' | 'success';
}

export interface Execution {
  id: string;
  workflow_id: string;
  workflow_name: string;
  trigger: string;
  status: 'QUEUED' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'PAUSED';
  current_node_id?: string | null;
  start_time?: string;
  end_time?: string;
  duration_ms: number;
  error_message?: string;
  logs?: ExecutionLog[];
  screenshots?: string[];
  final_variables?: Record<string, any>;
  created_at: string;
}

export interface Credential {
  id: string;
  name: string;
  type: 'login' | 'api_key' | 'secret' | 'payment';
  username_or_key: string | null;
  masked_secret: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface BrowserProfile {
  id: string;
  name: string;
  user_data_dir: string;
  cookies_json: string;
  user_agent: string | null;
  is_default: number;
  created_at: string;
  updated_at: string;
}

export interface Schedule {
  id: string;
  workflow_id: string;
  workflow_name?: string;
  name: string;
  cron_expression: string;
  frequency: string;
  time: string;
  timezone: string;
  is_enabled: number;
  next_run_at: string | null;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Template {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables: Record<string, any>;
}
