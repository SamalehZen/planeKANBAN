export enum UIState {
  IDLE = 'idle',
  MODE_SELECT = 'mode_select',
  LISTENING = 'listening',
  THINKING = 'thinking',
}

export type ProcessingMode = 'auto' | 'email' | 'prompt' | 'message' | 'note' | 'brut' | 'doc' | 'planning';
