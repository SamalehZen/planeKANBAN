import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Check } from 'lucide-react';
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

  const isLight = theme === 'light';

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

  const handleFloatingButtonClick = useCallback(() => {
    if (!isVisible) {
      setIsVisible(true);
      setUiState(UIState.IDLE);
      
      setTimeout(() => {
        setUiState(UIState.MODE_SELECT);
      }, 1000);
    }
  }, [isVisible]);

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

  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  return (
    <>
      <AnimatePresence>
        {!isVisible && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            onClick={handleFloatingButtonClick}
            className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg backdrop-blur-md transition-all duration-300 hover:scale-110 active:scale-95
              ${isLight 
                ? 'bg-white/80 border border-gray-200 shadow-gray-200/50' 
                : 'bg-zinc-900/80 border border-white/10 shadow-black/30'
              }`}
          >
            <Mic className={`w-6 h-6 ${isLight ? 'text-zinc-700' : 'text-white'}`} />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isVisible && uiState === UIState.LISTENING && (
          <motion.button
            initial={{ scale: 0, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            onClick={stopRecording}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-16 h-16 rounded-full flex items-center justify-center shadow-lg bg-emerald-500 hover:bg-emerald-600 active:scale-95 transition-all duration-200"
            style={{
              boxShadow: '0 0 20px rgba(16, 185, 129, 0.5), 0 0 40px rgba(16, 185, 129, 0.3)'
            }}
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <Check className="w-7 h-7 text-white" strokeWidth={3} />
            </motion.div>
          </motion.button>
        )}
      </AnimatePresence>

      {isVisible && (
        <DynamicNotch
          uiState={uiState}
          selectedMode={selectedMode}
          theme={theme}
          onModeSelect={handleModeSelect}
        />
      )}
    </>
  );
};
