export interface ToolParameter {
  name: string;
  type: string; // 'STRING', 'NUMBER', 'BOOLEAN'
  description: string;
}

export interface CustomTool {
  id: string;
  name: string;
  description: string;
  parameters: ToolParameter[];
}

export interface AssistantConfig {
  name: string;
  companyName: string;
  primaryColor: string;
  systemInstruction: string;
  customTools?: CustomTool[];
}

export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}

export interface AudioVisualizerState {
  volume: number;
}