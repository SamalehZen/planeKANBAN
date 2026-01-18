import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DynamicNotch } from './DynamicNotch';
import { UIState } from './types';

interface DynamicNotchControllerProps {
  onVoiceStart?: () => void;
  onVoiceEnd?: (audioBlob: Blob) => void;
  onAIResponse?: (text: string) => void;
  theme?: 'light' | 'dark';
}

export const DynamicNotchController: React.FC<DynamicNotchControllerProps> = ({
  onVoiceStart,
  onVoiceEnd,
  onAIResponse,
  theme = 'dark'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [uiState, setUiState] = useState<UIState>(UIState.IDLE);
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  const lastCtrlPressRef = useRef<number>(0);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mousePositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Track mouse position for text injection
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePositionRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // CTRL double-tap detection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        const now = Date.now();
        const timeSinceLastPress = now - lastCtrlPressRef.current;
        
        if (timeSinceLastPress < 300) {
          // Double-tap detected
          handleDoubleTap();
        }
        lastCtrlPressRef.current = now;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [uiState, isVisible]);

  const handleDoubleTap = useCallback(() => {
    if (!isVisible) {
      // First double-tap: Show IDLE → MODE_SELECT
      setIsVisible(true);
      setUiState(UIState.IDLE);
      
      // After 1 second, show MODE_SELECT
      setTimeout(() => {
        setUiState(UIState.MODE_SELECT);
      }, 1000);
    } else if (uiState === UIState.LISTENING) {
      // Second double-tap during LISTENING: Stop recording → THINKING
      stopRecording();
    }
  }, [isVisible, uiState]);

  const handleModeSelect = useCallback((modeId: string) => {
    setSelectedMode(modeId);
    setUiState(UIState.LISTENING);
    startRecording();
    onVoiceStart?.();
  }, [onVoiceStart]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        onVoiceEnd?.(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  }, [onVoiceEnd]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setUiState(UIState.THINKING);

    // Simulate AI processing (3-4 seconds)
    setTimeout(() => {
      // AI processing complete → Return to IDLE
      setUiState(UIState.IDLE);
      
      // Inject text at mouse position (callback)
      onAIResponse?.('AI generated text');
      
      // Hide after 3 seconds
      hideTimeoutRef.current = setTimeout(() => {
        setIsVisible(false);
        setSelectedMode(null);
        setUiState(UIState.IDLE);
      }, 3000);
    }, 3500);
  }, [onAIResponse]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  if (!isVisible) return null;

  return (
    <DynamicNotch
      uiState={uiState}
      selectedMode={selectedMode}
      theme={theme}
      onModeSelect={handleModeSelect}
    />
  );
};
