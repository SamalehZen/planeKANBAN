import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square } from 'lucide-react';
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
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mousePositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePositionRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        const now = Date.now();
        const timeSinceLastPress = now - lastCtrlPressRef.current;

        if (timeSinceLastPress < 300) {
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
      setIsVisible(true);
      setUiState(UIState.IDLE);
      setTimeout(() => {
        setUiState(UIState.MODE_SELECT);
      }, 1000);
    } else if (uiState === UIState.LISTENING) {
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

    setTimeout(() => {
      setUiState(UIState.IDLE);
      onAIResponse?.('AI generated text');
      hideTimeoutRef.current = setTimeout(() => {
        setIsVisible(false);
        setSelectedMode(null);
        setUiState(UIState.IDLE);
      }, 3000);
    }, 3500);
  }, [onAIResponse]);

  const handleMicClick = useCallback(() => {
    setIsVisible(true);
    setUiState(UIState.IDLE);
    setTimeout(() => {
      setUiState(UIState.MODE_SELECT);
    }, 1000);
  }, []);

  const handleStopClick = useCallback(() => {
    stopRecording();
  }, [stopRecording]);

  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const isLight = theme === 'light';

  return (
    <>
      <AnimatePresence>
        {isVisible && (
          <DynamicNotch
            uiState={uiState}
            selectedMode={selectedMode}
            theme={theme}
            onModeSelect={handleModeSelect}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!isVisible && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleMicClick}
            className={`fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full backdrop-blur-xl flex items-center justify-center shadow-lg ${
              isLight
                ? 'bg-white/80 border border-white/40 shadow-black/10'
                : 'bg-[#121212]/80 border border-white/10 shadow-black/40'
            }`}
          >
            <Mic className={`w-6 h-6 ${isLight ? 'text-zinc-700' : 'text-white'}`} />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isVisible && uiState === UIState.LISTENING && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleStopClick}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/40"
            style={{
              animation: 'pulse-glow 2s ease-in-out infinite',
            }}
          >
            <Square className="w-6 h-6 text-white" fill="white" />
          </motion.button>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(239, 68, 68, 0.4), 0 10px 40px rgba(239, 68, 68, 0.3);
          }
          50% {
            box-shadow: 0 0 30px rgba(239, 68, 68, 0.6), 0 10px 50px rgba(239, 68, 68, 0.4);
          }
        }
      `}</style>
    </>
  );
};
