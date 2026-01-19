import { createContext, useContext, useCallback, useState, useRef, ReactNode } from 'react';

interface DynamicNotchContextValue {
  isActive: boolean;
  startVoiceInput: (callback: (text: string, isProcessed: boolean) => void) => void;
  stopVoiceInput: () => void;
  workspaceSlug: string | null;
  setWorkspaceSlug: (slug: string) => void;
}

const DynamicNotchContext = createContext<DynamicNotchContextValue | null>(null);

interface DynamicNotchProviderProps {
  children: ReactNode;
  defaultWorkspaceSlug?: string;
}

export const DynamicNotchProvider = ({ children, defaultWorkspaceSlug }: DynamicNotchProviderProps) => {
  const [isActive, setIsActive] = useState(false);
  const [workspaceSlug, setWorkspaceSlug] = useState<string | null>(defaultWorkspaceSlug || null);
  const callbackRef = useRef<((text: string, isProcessed: boolean) => void) | null>(null);

  const startVoiceInput = useCallback((callback: (text: string, isProcessed: boolean) => void) => {
    callbackRef.current = callback;
    setIsActive(true);
    window.dispatchEvent(new CustomEvent('dynamic-notch-open', { 
      detail: { callback } 
    }));
  }, []);

  const stopVoiceInput = useCallback(() => {
    callbackRef.current = null;
    setIsActive(false);
    window.dispatchEvent(new CustomEvent('dynamic-notch-close'));
  }, []);

  return (
    <DynamicNotchContext.Provider value={{
      isActive,
      startVoiceInput,
      stopVoiceInput,
      workspaceSlug,
      setWorkspaceSlug,
    }}>
      {children}
    </DynamicNotchContext.Provider>
  );
};

export const useDynamicNotch = () => {
  const context = useContext(DynamicNotchContext);
  if (!context) {
    return {
      isActive: false,
      startVoiceInput: () => {},
      stopVoiceInput: () => {},
      workspaceSlug: null,
      setWorkspaceSlug: () => {},
    };
  }
  return context;
};

export interface UseDynamicNotchInputOptions {
  workspaceSlug?: string;
  onTranscript?: (text: string, isProcessed: boolean) => void;
  enabled?: boolean;
}

export const useDynamicNotchInput = (options: UseDynamicNotchInputOptions = {}) => {
  const { workspaceSlug, onTranscript, enabled = true } = options;
  const [isListening, setIsListening] = useState(false);
  const callbackRef = useRef(onTranscript);
  
  callbackRef.current = onTranscript;

  const triggerVoiceInput = useCallback(() => {
    if (!enabled) return;
    
    setIsListening(true);
    
    window.dispatchEvent(new CustomEvent('dynamic-notch-trigger', {
      detail: {
        workspaceSlug,
        onTranscript: (text: string, isProcessed: boolean) => {
          setIsListening(false);
          callbackRef.current?.(text, isProcessed);
        },
        onClose: () => {
          setIsListening(false);
        }
      }
    }));
  }, [workspaceSlug, enabled]);

  return {
    isListening,
    triggerVoiceInput,
  };
};
