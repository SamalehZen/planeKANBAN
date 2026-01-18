import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UIState } from './types';
import { ChromeIcon, WaveformIcon } from './Icons';
import { 
  Sparkles, Monitor, Mail, Wand2, 
  MessageCircle, StickyNote, Clipboard, 
  FileText, Calendar 
} from 'lucide-react';

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
    <div className="fixed top-8 left-0 w-full flex justify-center z-50 pointer-events-none">
      <motion.div
        layout="preserve-aspect"
        initial={false}
        animate={{ width, height, borderRadius }}
        transition={springTransition}
        className={`relative flex flex-col items-center pointer-events-auto backdrop-blur-[40px] saturate-150 overflow-hidden transition-colors duration-500
          ${isLight 
            ? 'bg-white/75 shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-white/40 ring-1 ring-black/5' 
            : 'bg-[#121212]/80 shadow-[0_10px_40px_rgba(0,0,0,0.7)] border border-white/10 ring-1 ring-white/5'
          }`}
        style={{ 
          transform: 'translateZ(0)',
          willChange: 'width, height',
          backfaceVisibility: 'hidden'
        }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          
          {isMenuOpen ? (
            <motion.div
              key="mode-grid"
              initial={{ opacity: 0, scale: 0.95, filter: 'blur(8px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.95, filter: 'blur(8px)', transition: { duration: 0.15 } }}
              transition={{ delay: 0.05, duration: 0.3 }}
              className="absolute inset-0 w-full h-full p-5 grid grid-cols-4 gap-3 place-items-center"
            >
              {MODES.map((mode, i) => (
                <motion.button
                  key={mode.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.02 + (i * 0.02), type: 'spring', stiffness: 250, damping: 25 }}
                  onClick={() => onModeSelect && onModeSelect(mode.id)}
                  className="flex flex-col items-center justify-center gap-2 w-full h-full group cursor-pointer"
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-active:scale-95
                    ${isLight 
                       ? 'bg-gradient-to-br from-zinc-50 to-zinc-100 shadow-sm border border-white/50' 
                       : 'bg-gradient-to-br from-white/10 to-white/5 border border-white/10 shadow-inner'}`}>
                    <mode.icon 
                      className={`w-5 h-5 transition-colors ${isLight ? mode.color.replace('text-', 'text-zinc-700') : mode.color}`}
                      strokeWidth={2}
                    />
                  </div>
                  <span className={`text-[11px] font-medium tracking-wide transition-colors ${isLight ? 'text-zinc-500 group-hover:text-zinc-900' : 'text-zinc-400 group-hover:text-white'}`}>
                    {mode.label}
                  </span>
                </motion.button>
              ))}
            </motion.div>
          ) : (
            
            <motion.div 
              key="compact-row"
              className="absolute inset-0 w-full h-full flex items-center justify-between px-5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center gap-3 pl-1 shrink-0">
                <AnimatePresence mode="wait">
                  <motion.div 
                    key={selectedMode || 'default'}
                    initial={{ scale: 0.5, opacity: 0, rotate: -20 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    exit={{ scale: 0.5, opacity: 0, rotate: 20 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                    className="relative z-10 flex items-center justify-center w-8 h-8"
                  >
                     {ActiveIconComponent === ChromeIcon ? (
                        <ChromeIcon className="w-8 h-8" />
                     ) : (
                        <ActiveIconComponent 
                           className={`w-6 h-6 ${isLight ? activeModeColor?.replace('text-', 'text-zinc-800') : activeModeColor}`}
                           strokeWidth={2.5}
                        />
                     )}
                  </motion.div>
                </AnimatePresence>
                
                <AnimatePresence mode="wait">
                  {uiState === UIState.LISTENING && (
                    <motion.span
                      initial={{ opacity: 0, x: -10, width: 0 }}
                      animate={{ opacity: 1, x: 0, width: 'auto' }}
                      exit={{ opacity: 0, x: -5, width: 0 }}
                      transition={{ duration: 0.3, type: "spring", bounce: 0 }}
                      className={`text-[15px] font-medium whitespace-nowrap overflow-hidden
                        ${isLight ? 'text-zinc-800' : 'text-white'}`}
                    >
                      Listening...
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex items-center justify-end pr-1 h-full min-w-[50px]">
                <AnimatePresence mode="wait">
                  {uiState === UIState.IDLE && (
                    <motion.div
                       key="idle-dot"
                       initial={{ scale: 0 }}
                       animate={{ scale: 1 }}
                       exit={{ scale: 0 }}
                       transition={{ type: "spring", bounce: 0.4 }}
                       className="relative w-2 h-2"
                    >
                      <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${isLight ? 'bg-green-400' : 'bg-green-500'}`}></span>
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${isLight ? 'bg-green-500' : 'bg-green-400'}`}></span>
                    </motion.div>
                  )}
                  {uiState === UIState.LISTENING && (
                    <motion.div
                      key="listening"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="h-full flex items-center mr-2"
                    >
                      <WaveformIcon isLight={isLight} />
                    </motion.div>
                  )}
                  {uiState === UIState.THINKING && (
                    <motion.div
                      key="thinking"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex items-center gap-3 mr-1"
                    >
                      <div className="flex items-center gap-2">
                         <div className="relative flex items-center justify-center w-4 h-4">
                            <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                                className="absolute inset-0"
                            >
                                <Sparkles className="w-full h-full text-[#007AFF]" fill="currentColor" />
                            </motion.div>
                         </div>
                         <span className={`text-[13px] font-medium tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[#007AFF] to-purple-500`}>
                           Thinking
                         </span>
                      </div>
                      <div className={`w-[1px] h-3 ${isLight ? 'bg-zinc-300' : 'bg-white/10'}`} />
                      <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="h-7 pl-1.5 pr-3 rounded-full bg-[#007AFF] flex items-center gap-1.5 shadow-lg shadow-blue-500/20"
                      >
                         <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                            <Monitor className="w-3 h-3 text-white" />
                         </div>
                         <span className="text-[11px] font-medium text-white">Browser</span>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
});

DynamicNotch.displayName = 'DynamicNotch';
