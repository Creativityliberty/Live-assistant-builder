export interface AssistantConfig {
  name: string;
  companyName: string;
  primaryColor: string;
  systemInstruction: string;
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
