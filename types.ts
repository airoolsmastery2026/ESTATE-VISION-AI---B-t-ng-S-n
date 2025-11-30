export interface GeneratedAsset {
  id: string;
  type: 'script' | 'thumbnail' | 'video' | 'audio';
  content: string; // Text content or Base64/URL
  status: 'pending' | 'success' | 'error';
  metadata?: any;
}

export interface Project {
  id: string;
  topic: string;
  createdAt: number;
  assets: GeneratedAsset[];
}

export enum GenerationStep {
  IDLE = 'IDLE',
  SCRIPTING = 'SCRIPTING',
  VISUALIZING = 'VISUALIZING',
  FILMING = 'FILMING',
  VOICING = 'VOICING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

// Window interface for AI Studio overlay
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
}