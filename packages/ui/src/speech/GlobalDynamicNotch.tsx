import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DynamicNotchController } from './DynamicNotchController';

interface GlobalDynamicNotchProps {
  workspaceSlug?: string;
  language?: string;
  theme?: 'light' | 'dark' | 'auto';
  showFloatingButton?: boolean;
}

interface TriggerDetail {
  workspaceSlug?: string;
  onTranscript?: (text: string, isProcessed: boolean) => void;
  onClose?: () => void;
}

export const GlobalDynamicNotch: React.FC<GlobalDynamicNotchProps> = ({
  workspaceSlug: defaultWorkspaceSlug,
  language = 'fr-FR',
  theme = 'auto',
  showFloatingButton = true,
}) => {
  const [activeWorkspaceSlug, setActiveWorkspaceSlug] = useState(defaultWorkspaceSlug);
  const callbackRef = useRef<((text: string, isProcessed: boolean) => void) | null>(null);
  const closeCallbackRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const handleTrigger = (event: CustomEvent<TriggerDetail>) => {
      const { workspaceSlug, onTranscript, onClose } = event.detail;
      if (workspaceSlug) {
        setActiveWorkspaceSlug(workspaceSlug);
      }
      callbackRef.current = onTranscript || null;
      closeCallbackRef.current = onClose || null;
    };

    const handleClose = () => {
      closeCallbackRef.current?.();
      callbackRef.current = null;
      closeCallbackRef.current = null;
    };

    window.addEventListener('dynamic-notch-trigger', handleTrigger as EventListener);
    window.addEventListener('dynamic-notch-close', handleClose);

    return () => {
      window.removeEventListener('dynamic-notch-trigger', handleTrigger as EventListener);
      window.removeEventListener('dynamic-notch-close', handleClose);
    };
  }, []);

  const handleTranscript = useCallback((text: string, isProcessed: boolean) => {
    if (callbackRef.current) {
      callbackRef.current(text, isProcessed);
      callbackRef.current = null;
      closeCallbackRef.current = null;
    }
  }, []);

  const handleError = useCallback((error: string) => {
    console.error('[GlobalDynamicNotch] Error:', error);
  }, []);

  return (
    <DynamicNotchController
      workspaceSlug={activeWorkspaceSlug}
      language={language}
      theme={theme}
      showFloatingButton={showFloatingButton}
      onTranscript={handleTranscript}
      onError={handleError}
    />
  );
};

GlobalDynamicNotch.displayName = 'GlobalDynamicNotch';
