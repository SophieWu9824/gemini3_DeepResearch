export enum Sender {
  USER = 'user',
  AI = 'ai'
}

export interface GroundingSource {
  uri: string;
  title: string;
}

export interface Message {
  id: string;
  text: string; // The displayed chat text
  sender: Sender;
  timestamp: number;
  isStreaming?: boolean;
  isLoading?: boolean;
  sources?: GroundingSource[];
}

export interface ArtifactState {
  content: string;
  title: string;
  isVisible: boolean;
  isStreaming: boolean;
}

export type StreamChunk = {
  text: string;
  groundingChunks?: any[];
};
