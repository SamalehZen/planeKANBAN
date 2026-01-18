import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UIState } from './types';
import { ChromeIcon, WaveformIcon } from './Icons';
import { Sparkles, Monitor, Mail, Wand2, MessageCircle, StickyNote, Clipboard, FileText, Calendar } from 'lucide-react';

interface DynamicNotchProps {
  uiState: UIState;
  selectedMode: string | null;
  theme?: 'light' | 'dark';
  onModeSelect?: (mode: string) => void;
}

export const MODES = [
  { id: 'auto', label: 'Auto', icon: Sparkles, color: 'text-amber-400', bg: 'bg-amber-400/10' },
  { id: 'email', label: 'Email', icon: Mail, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  { id: 'prompt', label: 'Prompt', icon: Wand2, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  { id: 'message', label: 'Message', icon: MessageCircle, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  { id: 'note', label: 'Note', icon: StickyNote, color: 'text-orange-400', bg: 'bg-orange-400/10' },
  { id: 'brut', label: 'Brut', icon: Clipboard, color: 'text-zinc-400', bg: 'bg-zinc-400/10' },
  { id: 'doc', label: 'Doc', icon: FileText, color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
  { id: 'planning', label: 'Planning', icon: Calendar, color: 'text-rose-400', bg: 'bg-rose-400/10' },
];

const springTransition = {
  type: "spring",
  stiffness: 180,
  damping: 24,
  mass: 0.8,
  restDelta: 0.001
};

export const DynamicNotch: React.FC<DynamicNotchProps> = React.memo(({ uiState, selectedMode, theme = 'dark', onModeSelect }) => {
  const isLight = theme === 'light';
  const isMenuOpen = uiState === UIState.MODE_SELECT;

  const { width, height, borderRadius } = useMemo(() => {
    if (uiState === UIState.MODE_SELECT) {
      return { width: 440, height: 210, borderRadius: 36 };
    } else if (uiState === UIState.LISTENING) {
      return { width: 380, height: 53, borderRadius: 27 };
    } else if (uiState === UIState.THINKING) {
      return { width: 420, height: 53, borderRadius: 27 };
    }
    return { width: 180, height: 53, borderRadius: 27 };
  }, [uiState]);

  const ActiveIconComponent = useMemo(() => {
    if (!selectedMode) return ChromeIcon;
    const mode = MODES.find(m => m.id === selectedMode);
    return mode ? mode.icon : ChromeIcon;
  }, [selectedMode]);

  const activeModeColor = useMemo(() => {
    if (!selectedMode) return null;
    const mode = MODES.find(m => m.id === selectedMode);
    return mode?.color;
  }, [selectedMode]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0, width, height, borderRadius }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      transition={springTransition}
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-[9999] overflow-hidden backdrop-blur-[40px] saturate-150 ${
        isLight
          ? 'bg-white/75 border border-white/40 shadow-xl'
          : 'bg-[#121212]/80 border border-white/10 shadow-2xl shadow-black/50'
      }`}
      style={{ transform: 'translateX(-50%) translateZ(0)', willChange: 'width, height' }}
    >
      <AnimatePresence mode="wait">
        {isMenuOpen ? (
          <motion.div
            key="menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-4 grid-rows-2 gap-2 p-4 h-full"
          >
            {MODES.map((mode, i) => (
              <motion.button
                key={mode.id}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onModeSelect && onModeSelect(mode.id)}
                className="flex flex-col items-center justify-center gap-2 w-full h-full group cursor-pointer"
              >
                <div className={`w-12 h-12 rounded-2xl ${mode.bg} flex items-center justify-center transition-all group-hover:scale-110`}>
                  <mode.icon className={`w-6 h-6 ${mode.color}`} />
                </div>
                <span className={`text-[10px] font-medium ${isLight ? 'text-zinc-600' : 'text-white/70'}`}>
                  {mode.label}
                </span>
              </motion.button>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="compact"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-between h-full px-4"
          >
            <div className="flex items-center gap-3">
              {ActiveIconComponent === ChromeIcon ? (
                <ChromeIcon className={`w-5 h-5 ${isLight ? 'text-zinc-800' : 'text-white'}`} />
              ) : (
                <ActiveIconComponent className={`w-5 h-5 ${activeModeColor || (isLight ? 'text-zinc-800' : 'text-white')}`} />
              )}
              {uiState === UIState.LISTENING && (
                <span className={`text-sm font-medium ${isLight ? 'text-zinc-800' : 'text-white'}`}>
                  Listening...
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {uiState === UIState.IDLE && (
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"
                />
              )}
              {uiState === UIState.LISTENING && (
                <WaveformIcon isLight={isLight} />
              )}
              {uiState === UIState.THINKING && (
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className={`w-4 h-4 border-2 border-t-transparent rounded-full ${isLight ? 'border-zinc-600' : 'border-white'}`}
                  />
                  <span className={`text-sm font-medium ${isLight ? 'text-zinc-800' : 'text-white'}`}>
                    Thinking
                  </span>
                  <Monitor className={`w-4 h-4 ${isLight ? 'text-zinc-600' : 'text-white/60'}`} />
                  <span className={`text-xs ${isLight ? 'text-zinc-500' : 'text-white/40'}`}>
                    Browser
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});
