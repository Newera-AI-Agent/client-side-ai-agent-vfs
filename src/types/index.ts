// VFS Types
export interface VFSNode {
  id: string;
  name: string;
  type: 'file' | 'directory';
  parentId: string | null;
  content?: string; // for files
  children?: string[]; // for directories - array of child IDs
  createdAt: number;
  updatedAt: number;
  size?: number;
}

export interface VFSState {
  nodes: Record<string, VFSNode>;
  rootId: string;
  expandedIds: Set<string>;
  selectedId: string | null;
}

// Agent Types
export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: unknown;
  error?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: number;
  completedAt?: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolCalls?: ToolCall[];
  timestamp: number;
}

export interface AgentState {
  messages: Message[];
  currentPlan: string[];
  isRunning: boolean;
  currentToolCall: ToolCall | null;
  toolCallHistory: ToolCall[];
}

// Tool definitions
export type ToolName =
  | 'write_file'
  | 'read_file'
  | 'edit_file'
  | 'delete_file'
  | 'move_file'
  | 'list_files'
  | 'run_python'
  | 'run_ffmpeg'
  | 'run_sql'
  | 'git'
  | 'search_files'
  | 'generate_image'
  | 'search_web'
  | 'read_url'
  | 'extract_zip';

export interface ToolDefinition {
  name: ToolName;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required: string[];
  };
}

// WASM Tool Types
export interface PythonResult {
  stdout: string;
  stderr: string;
  returnCode: number;
  files?: Record<string, string>;
}

export interface FFmpegResult {
  stdout: string;
  stderr: string;
  outputFiles: Record<string, Uint8Array>;
}

export interface SQLResult {
  columns: string[];
  rows: unknown[][];
}

export interface GitResult {
  stdout: string;
  stderr: string;
}

// UI State
export interface UIState {
  activePanel: 'chat' | 'vfs' | 'tools' | 'terminal' | 'editor';
  sidebarOpen: boolean;
  terminalOpen: boolean;
  editorFile: string | null;
}

// Agent Loop Types
export interface AgentStep {
  thought: string;
  action: {
    tool: ToolName;
    args: Record<string, unknown>;
  };
  observation?: string;
}

export interface AgentLoopResult {
  steps: AgentStep[];
  finalResponse: string;
  completed: boolean;
}