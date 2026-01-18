import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UIState } from './types';
import { ChromeIcon, WaveformIcon } from './Icons';
import { 
  Sparkles, Mail, Wand2, 
  MessageCircle, StickyNote, Clipboard, 
  FileText, Calendar, CloudSun 
} from 'lucide-react';

interface DynamicNotchProps {
  uiState: UIState;
  selectedMode: string | null;
  theme?: 'light' | 'dark';
  onModeSelect?: (mode: string) => void;
}

export const MODES = [
  { id: 'auto', label: 'Auto', icon: Sparkles, colorDark: 'text-amber-400', colorLight: 'text-amber-600' },
  { id: 'email', label: 'Email', icon: Mail, colorDark: 'text-blue-400', colorLight: 'text-blue-600' },
  { id: 'prompt', label: 'Prompt', icon: Wand2, colorDark: 'text-purple-400', colorLight: 'text-purple-600' },
  { id: 'message', label: 'Message', icon: MessageCircle, colorDark: 'text-emerald-400', colorLight: 'text-emerald-600' },
  { id: 'note', label: 'To do lister', icon: StickyNote, colorDark: 'text-yellow-400', colorLight: 'text-yellow-600' },
  { id: 'brut', label: 'Brut', icon: Clipboard, colorDark: 'text-zinc-300', colorLight: 'text-zinc-600' },
  { id: 'doc', label: 'Doc', icon: FileText, colorDark: 'text-indigo-400', colorLight: 'text-indigo-600' },
  { id: 'planning', label: 'Planning', icon: Calendar, colorDark: 'text-rose-400', colorLight: 'text-rose-600' },
  { id: 'weather', label: 'Weather', icon: CloudSun, colorDark: 'text-sky-400', colorLight: 'text-sky-600' },
];

const snappySpring = {
  type: "spring" as const,
  stiffness: 500,
  damping: 35,
  mass: 0.5,
  restDelta: 0.001
};

const instantSpring = {
  type: "spring" as const,
  stiffness: 600,
  damping: 40,
  mass: 0.4
};

export const DynamicNotch: React.FC<DynamicNotchProps> = React.memo(({ uiState, selectedMode, theme = 'dark', onModeSelect }) => {
  const isLight = theme === 'light';
  const isMenuOpen = uiState === UIState.MODE_SELECT;

  const activeMode = useMemo(() => {
    return MODES.find(m => m.id === selectedMode);
  }, [selectedMode]);

  const ActiveIconComponent = activeMode ? activeMode.icon : ChromeIcon;
  const activeModeColor = activeMode ? (isLight ? activeMode.colorLight : activeMode.colorDark) : null;
  const activeLabel = activeMode ? activeMode.label : 'Intelligence';

  const { width, height, borderBottomRadius } = useMemo(() => {
    if (uiState === UIState.MODE_SELECT) {
      return { width: 480, height: 360, borderBottomRadius: 36 }; 
    } else if (uiState === UIState.LISTENING || uiState === UIState.THINKING) {
      return { width: 360, height: 48, borderBottomRadius: 24 }; 
    }
    return { width: 200, height: 48, borderBottomRadius: 24 };
  }, [uiState]);

  return (
    <div className="fixed top-0 left-0 w-full flex justify-center z-50 pointer-events-none">
      <motion.div
        layout="preserve-aspect"
        initial={false}
        animate={{ 
          width, 
          height, 
          borderBottomLeftRadius: borderBottomRadius,
          borderBottomRightRadius: borderBottomRadius,
        }}
        transition={snappySpring}
        className={`relative flex flex-col items-center pointer-events-auto backdrop-blur-[50px] saturate-[1.8] overflow-hidden rounded-t-none border-t-0
          ${isLight 
            ? 'bg-gradient-to-b from-[#FAFAFA] via-[#F5F5F7] to-[#ECECEE] border-x border-b border-black/[0.08]' 
            : 'bg-gradient-to-b from-[#0A0A0A] via-[#111111] to-[#1A1A1A] border-x border-b border-white/[0.08]'
          }`}
        style={{ 
          transform: 'translateZ(0)',
          willChange: 'width, height',
          backfaceVisibility: 'hidden',
          boxShadow: isLight
            ? `
              0 8px 32px rgba(0,0,0,0.12),
              0 2px 8px rgba(0,0,0,0.08),
              inset 0 -2px 4px rgba(0,0,0,0.02),
              inset 0 -1px 0 rgba(255,255,255,0.9),
              inset 0 1px 0 rgba(255,255,255,0.5)
            `
            : `
              0 12px 40px rgba(0,0,0,0.9),
              0 4px 12px rgba(0,0,0,0.6),
              inset 0 -2px 6px rgba(255,255,255,0.04),
              inset 0 -1px 0 rgba(255,255,255,0.12),
              inset 0 1px 0 rgba(255,255,255,0.02)
            `
        }}
      >
        <div 
          className={`absolute bottom-0 left-4 right-4 h-[1px] ${
            isLight 
              ? 'bg-gradient-to-r from-transparent via-white/80 to-transparent' 
              : 'bg-gradient-to-r from-transparent via-white/15 to-transparent'
          }`}
          style={{ borderRadius: 'inherit' }}
        />
        
        <div 
          className={`absolute bottom-0 left-0 right-0 h-8 pointer-events-none ${
            isLight
              ? 'bg-gradient-to-t from-black/[0.02] to-transparent'
              : 'bg-gradient-to-t from-white/[0.03] to-transparent'
          }`}
          style={{ borderRadius: 'inherit' }}
        />

        <AnimatePresence mode="popLayout" initial={false}>
          
          {isMenuOpen ? (
            <motion.div
              key="mode-grid"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.08 } }}
              transition={{ duration: 0.12 }}
              className="absolute inset-0 w-full h-full p-6 pt-8 grid grid-cols-3 gap-4 place-items-center"
            >
              {MODES.map((mode, i) => (
                <motion.button
                  key={mode.id}
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ 
                    delay: i * 0.008,
                    ...instantSpring
                  }}
                  onClick={() => onModeSelect && onModeSelect(mode.id)}
                  className="flex flex-col items-center justify-center gap-2.5 w-full h-full group cursor-pointer"
                >
                  <div 
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform duration-150 group-hover:scale-110 group-active:scale-95
                      ${isLight 
                        ? 'bg-gradient-to-br from-white to-zinc-100/80 shadow-[0_2px_8px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,1)] border border-black/[0.06]' 
                        : 'bg-gradient-to-br from-white/[0.12] to-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-1px_0_rgba(0,0,0,0.2)] border border-white/[0.08]'
                      }`}
                  >
                    <mode.icon 
                      className={`w-6 h-6 ${isLight ? mode.colorLight : mode.colorDark}`} 
                      strokeWidth={1.8}
                    />
                  </div>
                  <span className={`text-[11px] font-semibold tracking-wide ${
                    isLight 
                      ? 'text-zinc-500 group-hover:text-zinc-900' 
                      : 'text-zinc-400 group-hover:text-white'
                  }`}>
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
              exit={{ opacity: 0, transition: { duration: 0.08 } }}
              transition={{ duration: 0.12 }}
            >
              <div className="flex items-center gap-3 shrink-0">
                <AnimatePresence mode="wait">
                  <motion.div 
                    key={selectedMode || 'default'}
                    initial={{ scale: 0.6, opacity: 0, rotate: -15 }}
                    animate={{ scale: 1, opacity: 1, rotate: 0 }}
                    exit={{ scale: 0.6, opacity: 0, rotate: 15 }}
                    transition={instantSpring}
                    className="relative z-10 flex items-center justify-center w-6 h-6"
                  >
                     {ActiveIconComponent === ChromeIcon ? (
                        <ChromeIcon className={`w-6 h-6 ${isLight ? 'text-zinc-700' : 'text-white/80'}`} />
                     ) : (
                        <ActiveIconComponent 
                           className={`w-5 h-5 ${activeModeColor}`} 
                           strokeWidth={2.5}
                        />
                     )}
                  </motion.div>
                </AnimatePresence>
                
                <motion.span
                  layout
                  transition={instantSpring}
                  className={`text-[14px] font-semibold tracking-wide whitespace-nowrap overflow-hidden
                    ${isLight ? 'text-zinc-800' : 'text-white'}`}
                >
                  {activeLabel}
                </motion.span>
              </div>

              <div className="flex items-center justify-end h-full">
                <AnimatePresence mode="wait">
                  {uiState === UIState.IDLE && (
                    <motion.div
                       key="idle-dot"
                       initial={{ scale: 0, opacity: 0 }}
                       animate={{ scale: 1, opacity: 1 }}
                       exit={{ scale: 0, opacity: 0 }}
                       transition={instantSpring}
                       className="relative w-2.5 h-2.5 mr-1"
                    >
                       <motion.div 
                         animate={{ opacity: [0.4, 1, 0.4] }}
                         transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                         className={`w-full h-full rounded-full ${
                           isLight 
                             ? 'bg-gradient-to-br from-zinc-400 to-zinc-500' 
                             : 'bg-gradient-to-br from-white/40 to-white/20'
                         }`}
                         style={{
                           boxShadow: isLight 
                             ? '0 0 6px rgba(0,0,0,0.15)' 
                             : '0 0 8px rgba(255,255,255,0.2)'
                         }}
                       />
                    </motion.div>
                  )}

                  {uiState === UIState.LISTENING && (
                    <motion.div
                      key="listening"
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      transition={instantSpring}
                      className="h-full flex items-center"
                    >
                      <WaveformIcon isLight={isLight} />
                    </motion.div>
                  )}

                  {uiState === UIState.THINKING && (
                    <motion.div
                      key="thinking"
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      transition={instantSpring}
                      className="flex items-center gap-2"
                    >
                       <motion.div
                          animate={{ rotate: 360, scale: [1, 1.15, 1] }}
                          transition={{ 
                            rotate: { repeat: Infinity, duration: 2.5, ease: "linear" }, 
                            scale: { repeat: Infinity, duration: 1.2, ease: "easeInOut" } 
                          }}
                       >
                          <Sparkles 
                            className={`w-4 h-4 ${isLight ? 'text-blue-600' : 'text-[#007AFF]'}`} 
                            fill="currentColor" 
                          />
                       </motion.div>
                       <span className={`text-[14px] font-semibold ${isLight ? 'text-blue-600' : 'text-[#007AFF]'}`}>
                         Thinking
                       </span>
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
