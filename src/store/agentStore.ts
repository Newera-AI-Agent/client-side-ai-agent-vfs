import { create } from 'zustand';
import type { AgentState, Message, ToolCall, ToolName } from '@/types';

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

interface AgentStore extends AgentState {
  addMessage: (role: 'user' | 'assistant' | 'system' | 'tool', content: string, toolCalls?: ToolCall[]) => Message;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  clearMessages: () => void;
  
  setPlan: (plan: string[]) => void;
  setIsRunning: (running: boolean) => void;
  setCurrentToolCall: (call: ToolCall | null) => void;
  addToolCallToHistory: (call: ToolCall) => void;
  updateToolCall: (id: string, updates: Partial<ToolCall>) => void;
  
  // Agent loop control
  runAgentLoop: (userInput: string) => Promise<void>;
  stopAgent: () => void;
}

export const useAgentStore = create<AgentStore>()((set, get) => ({
  messages: [],
  currentPlan: [],
  isRunning: false,
  currentToolCall: null,
  toolCallHistory: [],

  addMessage: (role, content, toolCalls) => {
    const message: Message = {
      id: generateId(),
      role,
      content,
      toolCalls,
      timestamp: Date.now(),
    };
    set((state) => ({ messages: [...state.messages, message] }));
    return message;
  },

  updateMessage: (id, updates) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, ...updates } : msg
      ),
    }));
  },

  clearMessages: () => set({ messages: [], toolCallHistory: [], currentPlan: [] }),

  setPlan: (plan) => set({ currentPlan: plan }),
  setIsRunning: (running) => set({ isRunning: running }),
  setCurrentToolCall: (call) => set({ currentToolCall: call }),
  
  addToolCallToHistory: (call) => {
    set((state) => ({ toolCallHistory: [...state.toolCallHistory, call] }));
  },
  
  updateToolCall: (id, updates) => {
    set((state) => ({
      currentToolCall: state.currentToolCall?.id === id ? { ...state.currentToolCall, ...updates } : state.currentToolCall,
      toolCallHistory: state.toolCallHistory.map((call) =>
        call.id === id ? { ...call, ...updates } : call
      ),
    }));
  },

  runAgentLoop: async (userInput: string) => {
    const { addMessage, setIsRunning, setPlan, setCurrentToolCall } = get();
    setIsRunning(true);
    
    addMessage('user', userInput);
    
    try {
      // Simple ReAct loop implementation
      // 1. Plan
      setPlan(['Analyze request', 'Find relevant tools', 'Execute tools', 'Return result']);
      addMessage('assistant', 'Analyzing your request...');
      
      // 2. Simple tool detection and execution
      // This is a simplified version - in productionwould call an LLM API
      const response = await simulateAgentThinking(userInput);
      
      addMessage('assistant', response);
      
    } catch (error) {
      addMessage('assistant', `Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsRunning(false);
      setCurrentToolCall(null);
    }
  },

  stopAgent: () => {
    set({ isRunning: false, currentToolCall: null });
  },
}));

// Simulated agent thinking - in a real app, this would call an LLM API
async function simulateAgentThinking(input: string): Promise<string> {
  // This is a placeholder for the actual agent loop
  return `I received your request: "${input}". The agent loop is now running.`;
}

// Selectors
export const selectMessages = (state: AgentStore) => state.messages;
export const selectCurrentPlan = (state: AgentStore) => state.currentPlan;
export const selectIsRunning = (state: AgentStore) => state.isRunning;
export const selectToolCallHistory = (state: AgentStore) => state.toolCallHistory;
