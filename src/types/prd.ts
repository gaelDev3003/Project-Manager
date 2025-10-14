export interface ApiEndpoint {
  method: string;
  path: string;
  description: string;
  request_body?: any;
  response?: any;
  auth_required: boolean;
  error_codes: Record<string, string>;
}

export interface DatabaseTable {
  name: string;
  columns: {
    name: string;
    type: string;
    constraints: string[];
  }[];
  indexes: string[];
  sql: string;
  rls_policy: string;
}

export interface DatabaseSchema {
  type?: 'relational' | 'non_relational';
  relational?: {
    tables: DatabaseTable[];
  };
  non_relational?: {
    collections: {
      name: string;
      document_example: any;
      indexes: string[];
      rules: string[];
    }[];
  };
  tables?: DatabaseTable[]; // 기존 호환성을 위해 유지
}

export interface ImplementationPhase {
  phase: string;
  title: string;
  estimated_hours: number;
  tasks: string[];
  acceptance_criteria: string[];
}

export interface Feature {
  name: string;
  priority: 'high' | 'medium' | 'low';
  risk: 'high' | 'medium' | 'low';
  effort?: 'low' | 'medium' | 'high';
  impacts?: string[];
  dependencies?: string[];
  tags?: string[];
  notes?: string;
}

export interface PRDData {
  summary: string;
  goals: string[];
  key_features: string[];
  out_of_scope: string[];
  risks: string[];
  acceptance: string[];
  features?: Feature[];
  technical_requirements?: {
    frontend: string[];
    backend: string[];
    database: string[];
    infrastructure: string[];
  };
  technical_stack?: {
    frontend: string[];
    backend: string[];
    database: string[];
    auth: string[];
    deployment: string[];
  };
  implementation_phases?: ImplementationPhase[];
  database_schema?: DatabaseSchema;
  api_endpoints?: ApiEndpoint[];
  nfrs?: {
    performance?: {
      p95_latency_ms?: number;
      throughput_rps?: number;
    };
    availability?: string;
    security?: string[];
    privacy?: string[];
    observability?: string[];
    accessibility?: string[];
    i18n?: string[];
  };
  environment_variables?: {
    key: string;
    description: string;
    required: boolean;
  }[];
  prompt_version?: string;
}

export interface PRDRecord {
  id: string;
  project_id: string;
  prd_data: PRDData;
  created_at: string;
  updated_at: string;
}

export interface PRDResponse extends PRDData {
  id: string;
  project_id: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  project_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  updated_at: string;
  type?: 'chat' | 'feedback';
}

export interface PRDChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  currentStep: 'initial' | 'questions' | 'summary' | 'finalized';
  prdOutline?: string;
}
