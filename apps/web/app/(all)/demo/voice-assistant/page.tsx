"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Check, Sun, Moon } from 'lucide-react';

function cn(...classes: Array<string | undefined | null | false>) {
  return classes.filter(Boolean).join(' ');
}

type VoiceAssistantState = 'idle' | 'menu' | 'listening' | 'processing' | 'result';
type ActionType = 'todo' | 'note' | 'document' | 'planning' | null;

const AudioVisualizer = ({ isDark }: { isDark: boolean }) => {
  const bars = 50;
  return (
    <div className="flex items-center justify-center gap-[2.5px] h-[35px]">
      {Array.from({ length: bars }).map((_, i) => {
        const delay = i * 0.04;
        const position = i / bars;
        const centerDistance = Math.abs(position - 0.5) * 2;
        return (
          <motion.div
            key={i}
            className={cn(
              'w-[2px] rounded-full bg-gradient-to-t',
              isDark
                ? 'from-white/40 via-white/70 to-white/90'
                : 'from-slate-900/40 via-slate-900/70 to-slate-900/90'
            )}
            animate={{
              height: [
                8 + Math.random() * 5,
                32 - centerDistance * 14,
                14 + Math.random() * 8,
                35 - centerDistance * 12,
                12 + Math.random() * 6,
                30 - centerDistance * 13,
              ],
              opacity: [0.5, 1, 0.7, 0.95, 0.6, 0.85],
            }}
            transition={{
              duration: 1.8 + Math.random() * 0.6,
              repeat: Infinity,
              delay,
              ease: [0.45, 0.05, 0.55, 0.95],
            }}
          />
        );
      })}
    </div>
  );
};

const ProcessingAnimation = ({ isDark }: { isDark: boolean }) => {
  return (
    <div className="relative w-full h-[35px] flex items-center justify-center">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className={cn('w-1.5 h-1.5 rounded-full', isDark ? 'bg-white/70' : 'bg-slate-900/70')}
            animate={{
              opacity: [0.3, 1, 0.3],
              scale: [0.8, 1.3, 0.8],
            }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.25, ease: 'easeInOut' }}
          />
        ))}
      </div>
    </div>
  );
};

export default function VoiceAssistantDemo() {
  const [state, setState] = useState<VoiceAssistantState>('idle');
  const [isVisible, setIsVisible] = useState(false);
  const [timer, setTimer] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [isDark, setIsDark] = useState(true);
  const [selectedAction, setSelectedAction] = useState<ActionType>(null);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const playStartSound = () => {
    const AudioCtx: typeof AudioContext | undefined = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const audioContext = new AudioCtx();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1);
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  };

  const playEndSound = () => {
    const AudioCtx: typeof AudioContext | undefined = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const audioContext = new AudioCtx();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.setValueAtTime(523, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(659, audioContext.currentTime + 0.12);
    gainNode.gain.setValueAtTime(0.25, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15);
  };

  useEffect(() => {
    const autoStart = setTimeout(() => {
      setIsVisible(true);
      setState('menu');
      playStartSound();
    }, 1000);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Fn' || e.key === 'F13' || e.code === 'Space') {
        e.preventDefault();
        if (!isVisible) {
          setIsVisible(true);
          setState('menu');
          playStartSound();
        } else {
          setIsVisible(false);
          setState('idle');
          setTimer(0);
          setSelectedAction(null);
          playEndSound();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(autoStart);
    };
  }, [isVisible]);

  useEffect(() => {
    let interval: number | undefined;
    if (state === 'listening') {
      interval = window.setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (interval) window.clearInterval(interval);
    };
  }, [state]);

  const handleActionSelect = (action: ActionType) => {
    setSelectedAction(action);
    setState('listening');
    setTimer(0);
  };

  useEffect(() => {
    if (!isVisible) return;

    if (state === 'listening') {
      const timeout = setTimeout(() => {
        setState('processing');
      }, 4000);
      return () => clearTimeout(timeout);
    }

    if (state === 'processing') {
      const timeout = setTimeout(() => {
        setTranscript('Your speech has been perfectly transcribed with AI-powered grammar correction and enhancement.');
        setState('result');
      }, 3000);
      return () => clearTimeout(timeout);
    }

    if (state === 'result') {
      playEndSound();
      const timeout = setTimeout(() => {
        setIsVisible(false);
        setState('idle');
        setTimer(0);
        setSelectedAction(null);
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [state, isVisible]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className={cn(
        'min-h-screen relative overflow-hidden transition-colors duration-500',
        isDark ? 'bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950' : 'bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100'
      )}
    >
      <div className="absolute inset-0 opacity-20">
        <div
          className={cn(
            'absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[128px] animate-pulse',
            isDark ? 'bg-white/5' : 'bg-slate-900/5'
          )}
        />
        <div
          className={cn(
            'absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-[128px] animate-pulse',
            isDark ? 'bg-white/5' : 'bg-slate-900/5'
          )}
          style={{ animationDelay: '1s' }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-8 gap-8">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsDark(!isDark)}
          className={cn(
            'fixed top-6 right-6 z-50 p-3 rounded-xl border backdrop-blur-xl transition-colors',
            isDark ? 'bg-black/80 border-white/10 text-white hover:bg-white/10' : 'bg-white/80 border-slate-200 text-slate-900 hover:bg-slate-100'
          )}
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </motion.button>

        <AnimatePresence>
          {isVisible && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -40 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed top-12 left-1/2 -translate-x-1/2 z-50"
            >
              <div className="relative">
                <motion.div
                  className={cn('absolute -inset-2 rounded-[28px] blur-lg', isDark ? 'bg-white/5' : 'bg-slate-900/5')}
                  animate={{
                    opacity:
                      state === 'listening' ? [0.2, 0.4, 0.2] : state === 'processing' ? [0.3, 0.5, 0.3] : 0.3,
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />

                <div
                  className={cn(
                    'relative backdrop-blur-xl border rounded-[24px] shadow-2xl overflow-hidden',
                    'transition-all duration-500',
                    isDark ? 'bg-black/80 border-white/10' : 'bg-white/80 border-slate-200/50'
                  )}
                  style={{ width: state === 'result' ? '420px' : state === 'menu' ? '320px' : '380px' }}
                >
                  <div className={cn('absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent to-transparent', isDark ? 'via-white/20' : 'via-slate-900/10')} />
                  <div className={cn('absolute top-0 left-4 w-16 h-8 rounded-br-3xl blur-sm', isDark ? 'bg-white/5' : 'bg-slate-900/5')} />

                  <div className="relative px-5 py-4">
                    <div className="flex items-center justify-between mb-4">
                      {state !== 'menu' && (
                        <div className="flex items-center gap-2.5">
                          <motion.div
                            className={cn(
                              'relative w-9 h-9 rounded-[10px] flex items-center justify-center overflow-hidden',
                              isDark ? 'bg-white/10' : 'bg-slate-900/10'
                            )}
                            animate={{ scale: state === 'listening' ? [1, 1.05, 1] : 1 }}
                            transition={{ scale: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' } }}
                          >
                            <div className={cn('absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b to-transparent', isDark ? 'from-white/20' : 'from-slate-900/15')} />
                            <div className={cn('absolute top-0 right-0 w-3 h-3 rounded-bl-lg blur-[2px]', isDark ? 'bg-white/30' : 'bg-slate-900/20')} />
                            {state === 'listening' && (
                              <Mic className={cn('w-4 h-4 relative z-10', isDark ? 'text-white' : 'text-slate-900')} />
                            )}
                            {state === 'processing' && (
                              <Mic className={cn('w-4 h-4 relative z-10', isDark ? 'text-white' : 'text-slate-900')} />
                            )}
                            {state === 'result' && (
                              <Check className={cn('w-4 h-4 relative z-10', isDark ? 'text-white' : 'text-slate-900')} />
                            )}
                          </motion.div>
                          <div>
                            <h3 className={cn('font-medium text-sm', isDark ? 'text-white' : 'text-slate-900')}>
                              {state === 'listening' && 'Listening'}
                              {state === 'processing' && 'Processing'}
                              {state === 'result' && 'Complete'}
                            </h3>
                            <p className={cn('text-xs', isDark ? 'text-white/40' : 'text-slate-600')}>
                              {state === 'listening' && formatTime(timer)}
                              {state === 'processing' && 'Thinking'}
                              {state === 'result' && 'Ready'}
                            </p>
                          </div>
                        </div>
                      )}

                      {state === 'menu' && (
                        <div className="flex items-center gap-2.5">
                          <div className="relative w-9 h-9 rounded-[10px] flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-500/20 to-violet-500/20">
                            <div className={cn('absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b to-transparent', isDark ? 'from-white/20' : 'from-slate-900/15')} />
                            <div className={cn('absolute top-0 right-0 w-3 h-3 rounded-bl-lg blur-[2px]', isDark ? 'bg-white/30' : 'bg-slate-900/20')} />
                            <Mic className={cn('w-4 h-4 relative z-10', isDark ? 'text-white' : 'text-slate-900')} />
                          </div>
                          <div>
                            <h3 className={cn('font-medium text-sm', isDark ? 'text-white' : 'text-slate-900')}>Que veux-tu créer ?</h3>
                            <p className={cn('text-xs', isDark ? 'text-white/40' : 'text-slate-600')}>Choisis une option</p>
                          </div>
                        </div>
                      )}

                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setIsVisible(false);
                          setState('idle');
                          setSelectedAction(null);
                          playEndSound();
                        }}
                        className={cn(
                          'relative w-8 h-8 rounded-lg border flex items-center justify-center transition-colors overflow-hidden',
                          isDark ? 'bg-white/5 hover:bg-white/10 border-white/10' : 'bg-slate-900/5 hover:bg-slate-900/10 border-slate-200'
                        )}
                      >
                        <div className={cn('absolute top-0 right-0 w-2 h-2 rounded-bl-lg blur-[1px]', isDark ? 'bg-white/20' : 'bg-slate-900/15')} />
                        <MicOff className={cn('w-4 h-4 relative z-10', isDark ? 'text-white/60' : 'text-slate-600')} />
                      </motion.button>
                    </div>

                    <div className={cn('flex items-center justify-center', state === 'menu' ? 'min-h-[140px]' : 'min-h-[35px]')}>
                      <AnimatePresence mode="wait">
                        {state === 'menu' && (
                          <motion.div
                            key="menu"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                            className="w-full space-y-2.5"
                          >
                            {[
                              { id: 'todo', label: 'Todo', icon: '✓' },
                              { id: 'note', label: 'Note', icon: '📝' },
                              { id: 'document', label: 'Document', icon: '📄' },
                              { id: 'planning', label: 'Planning', icon: '📅' },
                            ].map((action, index) => (
                              <motion.button
                                key={action.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.08, type: 'spring', stiffness: 300, damping: 25 }}
                                whileHover={{ scale: 1.03, x: 6 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => handleActionSelect(action.id as ActionType)}
                                className={cn(
                                  'group relative w-full flex items-center gap-3.5 px-4 py-3 rounded-xl border transition-all overflow-hidden backdrop-blur-sm',
                                  isDark
                                    ? 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20'
                                    : 'bg-slate-900/5 hover:bg-slate-900/10 border-slate-200 hover:border-slate-300'
                                )}
                              >
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                                <div className={cn('relative w-9 h-9 rounded-lg flex items-center justify-center text-base overflow-hidden', isDark ? 'bg-white/10' : 'bg-slate-900/10')}>
                                  <div className={cn('absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b to-transparent', isDark ? 'from-white/10' : 'from-slate-900/10')} />
                                  <div className={cn('absolute top-0 right-0 w-3 h-3 rounded-bl-lg blur-[2px]', isDark ? 'bg-white/20' : 'bg-slate-900/15')} />
                                  <span className="relative z-10">{action.icon}</span>
                                </div>
                                <span className={cn('relative text-sm font-medium tracking-wide', isDark ? 'text-white' : 'text-slate-900')}>
                                  {action.label}
                                </span>
                                <motion.div
                                  className={cn('ml-auto opacity-0 group-hover:opacity-100 transition-opacity', isDark ? 'text-white/40' : 'text-slate-600')}
                                  initial={{ x: -5 }}
                                  whileHover={{ x: 0 }}
                                >
                                  →
                                </motion.div>
                              </motion.button>
                            ))}
                          </motion.div>
                        )}

                        {state === 'listening' && (
                          <motion.div
                            key="listening"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.3 }}
                            className="w-full"
                          >
                            <AudioVisualizer isDark={isDark} />
                          </motion.div>
                        )}

                        {state === 'processing' && (
                          <motion.div
                            key="processing"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.3 }}
                            className="w-full"
                          >
                            <ProcessingAnimation isDark={isDark} />
                          </motion.div>
                        )}

                        {state === 'result' && (
                          <motion.div
                            key="result"
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 20, duration: 0.3 }}
                            className="w-full h-[35px] flex items-center justify-center"
                          >
                            <motion.div
                              className={cn('w-12 h-12 rounded-full flex items-center justify-center', isDark ? 'bg-white/10' : 'bg-slate-900/10')}
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.1 }}
                            >
                              <Check className={cn('w-6 h-6', isDark ? 'text-white' : 'text-slate-900')} strokeWidth={2.5} />
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!isVisible && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-center space-y-4">
            <div className={cn('inline-flex items-center gap-3 px-6 py-3 rounded-2xl backdrop-blur-sm border', isDark ? 'bg-white/5 border-white/10' : 'bg-slate-900/5 border-slate-200')}>
              <div className={cn('relative w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden', isDark ? 'bg-white/10' : 'bg-slate-900/10')}>
                <div className={cn('absolute top-0 right-0 w-3 h-3 rounded-bl-lg blur-[2px]', isDark ? 'bg-white/20' : 'bg-slate-900/15')} />
                <Mic className={cn('w-5 h-5 relative z-10', isDark ? 'text-white/80' : 'text-slate-700')} />
              </div>
              <div className="text-left">
                <p className={cn('font-medium text-sm', isDark ? 'text-white' : 'text-slate-900')}>Voice Assistant</p>
                <p className={cn('text-xs', isDark ? 'text-white/40' : 'text-slate-600')}>
                  Press{' '}
                  <kbd className={cn('px-1.5 py-0.5 rounded text-[10px] font-mono', isDark ? 'bg-white/10 text-white/60' : 'bg-slate-900/10 text-slate-700')}>
                    Space
                  </kbd>{' '}
                  to activate
                </p>
              </div>
            </div>
            <div className={cn('flex items-center justify-center gap-6 text-xs', isDark ? 'text-white/30' : 'text-slate-500')}>
              <div className="flex items-center gap-1.5">
                <div className={cn('w-1.5 h-1.5 rounded-full', isDark ? 'bg-white/40' : 'bg-slate-400')} />
                <span>Listening</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={cn('w-1.5 h-1.5 rounded-full', isDark ? 'bg-white/40' : 'bg-slate-400')} />
                <span>Processing</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={cn('w-1.5 h-1.5 rounded-full', isDark ? 'bg-white/40' : 'bg-slate-400')} />
                <span>Complete</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
