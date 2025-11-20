export interface TranscriptionItem {
  id: string;
  text: string;
  sender: 'user' | 'model';
  timestamp: Date;
  isFinal: boolean;
}

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
}

export interface AudioConfig {
  sampleRate: number;
}