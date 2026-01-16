"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { Mic, MicOff, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { TIntentType } from "@plane/services";
import { cn } from "@plane/utils";

export interface FloatingIntentPickerProps {
  onSelect: (intent: TIntentType) => void;
  onClose: () => void;
}

interface IntentOption {
  id: TIntentType;
  label: string;
  icon: string;
}

const INTENT_OPTIONS: IntentOption[] = [
  { id: "todo", label: "Todo", icon: "✓" },
  { id: "note", label: "Note", icon: "📝" },
  { id: "long_text", label: "Document", icon: "📄" },
  { id: "planning", label: "Planning", icon: "📅" },
];

export const FloatingIntentPicker = ({ onSelect, onClose }: FloatingIntentPickerProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const playStartSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
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
    } catch {}
  }, []);

  useEffect(() => {
    playStartSound();
  }, [playStartSound]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : INTENT_OPTIONS.length - 1));
          break;
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) => (prev < INTENT_OPTIONS.length - 1 ? prev + 1 : 0));
          break;
        case "Enter":
          e.preventDefault();
          onSelect(INTENT_OPTIONS[selectedIndex].id);
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
        case "1":
        case "2":
        case "3":
        case "4": {
          e.preventDefault();
          const index = parseInt(e.key, 10) - 1;
          if (index >= 0 && index < INTENT_OPTIONS.length) {
            onSelect(INTENT_OPTIONS[index].id);
          }
          break;
        }
      }
    },
    [selectedIndex, onSelect, onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <Transition.Root show as={Fragment}>
      <Dialog as="div" className="relative z-100" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-100 overflow-y-auto">
          <div className="flex min-h-full items-start justify-center pt-12">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95 -translate-y-4"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100 translate-y-0"
              leaveTo="opacity-0 scale-95 -translate-y-4"
            >
              <Dialog.Panel className="relative">
                <motion.div
                  className="absolute -inset-2 rounded-[28px] blur-lg bg-custom-primary-100/10"
                  animate={{ opacity: [0.2, 0.4, 0.2] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />

                <div className="relative backdrop-blur-xl bg-custom-background-100/90 dark:bg-custom-background-100/95 border border-custom-border-200 rounded-[24px] shadow-2xl overflow-hidden w-[320px]">
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-custom-border-300 to-transparent" />
                  <div className="absolute top-0 left-4 w-16 h-8 rounded-br-3xl blur-sm bg-custom-primary-100/5" />

                  <div className="relative px-5 py-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="relative w-9 h-9 rounded-[10px] flex items-center justify-center overflow-hidden bg-gradient-to-br from-custom-primary-100/20 to-custom-primary-200/20">
                          <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/20 to-transparent" />
                          <div className="absolute top-0 right-0 w-3 h-3 rounded-bl-lg blur-[2px] bg-white/30" />
                          <Mic className="w-4 h-4 relative z-10 text-custom-text-100" />
                        </div>
                        <div>
                          <h3 className="font-medium text-sm text-custom-text-100">Que veux-tu créer ?</h3>
                          <p className="text-xs text-custom-text-400">Choisis une option</p>
                        </div>
                      </div>

                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onClose}
                        className="relative w-8 h-8 rounded-lg border border-custom-border-200 flex items-center justify-center transition-colors bg-custom-background-90 hover:bg-custom-background-80 overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 w-2 h-2 rounded-bl-lg blur-[1px] bg-white/20" />
                        <MicOff className="w-4 h-4 relative z-10 text-custom-text-300" />
                      </motion.button>
                    </div>

                    <div className="space-y-2.5">
                      {INTENT_OPTIONS.map((option, index) => (
                        <motion.button
                          key={option.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.08, type: "spring", stiffness: 300, damping: 25 }}
                          whileHover={{ scale: 1.03, x: 6 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => onSelect(option.id)}
                          onMouseEnter={() => setSelectedIndex(index)}
                          className={cn(
                            "group relative w-full flex items-center gap-3.5 px-4 py-3 rounded-xl border transition-all overflow-hidden backdrop-blur-sm",
                            selectedIndex === index
                              ? "bg-custom-primary-100/10 border-custom-primary-100/30"
                              : "bg-custom-background-90/50 hover:bg-custom-background-80 border-custom-border-200 hover:border-custom-border-300"
                          )}
                        >
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-transparent via-white/5 to-transparent" />

                          <div className="relative w-9 h-9 rounded-lg flex items-center justify-center text-base overflow-hidden bg-custom-background-80">
                            <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/10 to-transparent" />
                            <div className="absolute top-0 right-0 w-3 h-3 rounded-bl-lg blur-[2px] bg-white/20" />
                            <span className="relative z-10">{option.icon}</span>
                          </div>

                          <span className="relative text-sm font-medium tracking-wide text-custom-text-100">
                            {option.label}
                          </span>

                          <div className="ml-auto flex items-center gap-2">
                            <span className="text-xs text-custom-text-400 font-mono">{index + 1}</span>
                            <motion.span
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-custom-text-400"
                              initial={{ x: -5 }}
                              whileHover={{ x: 0 }}
                            >
                              →
                            </motion.span>
                          </div>
                        </motion.button>
                      ))}
                    </div>

                    <div className="mt-4 pt-3 border-t border-custom-border-200 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-custom-text-400">
                        <span className="rounded bg-custom-background-80 px-1.5 py-0.5 font-mono">↑↓</span>
                        <span>naviguer</span>
                        <span className="rounded bg-custom-background-80 px-1.5 py-0.5 font-mono">↵</span>
                        <span>sélectionner</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export interface VoiceAssistantOverlayProps {
  state: "menu" | "listening" | "processing" | "result";
  intent: TIntentType | null;
  duration: number;
  volume: number;
  onSelectIntent: (intent: TIntentType) => void;
  onStop: () => void;
  onClose: () => void;
}

const AudioVisualizer = ({ volume }: { volume: number }) => {
  const bars = 50;
  const normalizedVolume = useMemo(() => Math.min(100, Math.max(0, volume)) / 100, [volume]);

  return (
    <div className="flex items-center justify-center gap-[2.5px] h-[35px]">
      {Array.from({ length: bars }).map((_, i) => {
        const position = i / bars;
        const centerDistance = Math.abs(position - 0.5) * 2;
        const baseHeight = 8 + (1 - centerDistance) * 12;
        const volumeBoost = normalizedVolume * 15 * (1 - centerDistance);

        return (
          <motion.div
            key={i}
            className="w-[2px] rounded-full bg-gradient-to-t from-custom-primary-100/40 via-custom-primary-100/70 to-custom-primary-100/90"
            animate={{
              height: [
                baseHeight + volumeBoost * 0.5,
                baseHeight + volumeBoost,
                baseHeight + volumeBoost * 0.7,
                baseHeight + volumeBoost * 0.9,
              ],
              opacity: [0.5, 1, 0.7, 0.85],
            }}
            transition={{
              duration: 0.8 + Math.random() * 0.4,
              repeat: Infinity,
              delay: i * 0.02,
              ease: [0.45, 0.05, 0.55, 0.95],
            }}
          />
        );
      })}
    </div>
  );
};

const ProcessingAnimation = () => {
  return (
    <div className="relative w-full h-[35px] flex items-center justify-center">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-custom-text-200"
            animate={{
              opacity: [0.3, 1, 0.3],
              scale: [0.8, 1.3, 0.8],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.25,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </div>
  );
};

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const INTENT_LABELS: Record<TIntentType, string> = {
  todo: "Todo",
  note: "Note",
  long_text: "Document",
  planning: "Planning",
};

export const VoiceAssistantOverlay = ({
  state,
  intent,
  duration,
  volume,
  onSelectIntent,
  onStop,
  onClose,
}: VoiceAssistantOverlayProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const playEndSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
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
    } catch {}
  }, []);

  useEffect(() => {
    if (state === "result") {
      playEndSound();
    }
  }, [state, playEndSound]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (state === "menu") {
        switch (e.key) {
          case "ArrowUp":
            e.preventDefault();
            setSelectedIndex((prev) => (prev > 0 ? prev - 1 : INTENT_OPTIONS.length - 1));
            break;
          case "ArrowDown":
            e.preventDefault();
            setSelectedIndex((prev) => (prev < INTENT_OPTIONS.length - 1 ? prev + 1 : 0));
            break;
          case "Enter":
            e.preventDefault();
            onSelectIntent(INTENT_OPTIONS[selectedIndex].id);
            break;
          case "1":
          case "2":
          case "3":
          case "4": {
            e.preventDefault();
            const index = parseInt(e.key, 10) - 1;
            if (index >= 0 && index < INTENT_OPTIONS.length) {
              onSelectIntent(INTENT_OPTIONS[index].id);
            }
            break;
          }
        }
      }

      if (e.key === "Escape") {
        e.preventDefault();
        if (state === "listening") {
          onStop();
        } else {
          onClose();
        }
      }
    },
    [state, selectedIndex, onSelectIntent, onStop, onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const cardWidth = state === "result" ? "420px" : state === "menu" ? "320px" : "380px";

  return (
    <Transition.Root show as={Fragment}>
      <Dialog as="div" className="relative z-100" onClose={() => {}}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-100 overflow-y-auto">
          <div className="flex min-h-full items-start justify-center pt-12">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95 -translate-y-4"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100 translate-y-0"
              leaveTo="opacity-0 scale-95 -translate-y-4"
            >
              <Dialog.Panel className="relative">
                <motion.div
                  className="absolute -inset-2 rounded-[28px] blur-lg bg-custom-primary-100/10"
                  animate={{
                    opacity: state === "listening" ? [0.2, 0.4, 0.2] : state === "processing" ? [0.3, 0.5, 0.3] : 0.3,
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />

                <motion.div
                  className="relative backdrop-blur-xl bg-custom-background-100/90 dark:bg-custom-background-100/95 border border-custom-border-200 rounded-[24px] shadow-2xl overflow-hidden"
                  animate={{ width: cardWidth }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-custom-border-300 to-transparent" />
                  <div className="absolute top-0 left-4 w-16 h-8 rounded-br-3xl blur-sm bg-custom-primary-100/5" />

                  <div className="relative px-5 py-4">
                    <div className="flex items-center justify-between mb-4">
                      {state !== "menu" && (
                        <div className="flex items-center gap-2.5">
                          <motion.div
                            className="relative w-9 h-9 rounded-[10px] flex items-center justify-center overflow-hidden bg-custom-background-80"
                            animate={{ scale: state === "listening" ? [1, 1.05, 1] : 1 }}
                            transition={{ scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" } }}
                          >
                            <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/20 to-transparent" />
                            <div className="absolute top-0 right-0 w-3 h-3 rounded-bl-lg blur-[2px] bg-white/30" />
                            {state === "result" ? (
                              <Check className="w-4 h-4 relative z-10 text-custom-text-100" />
                            ) : (
                              <Mic className="w-4 h-4 relative z-10 text-custom-text-100" />
                            )}
                          </motion.div>
                          <div>
                            <h3 className="font-medium text-sm text-custom-text-100">
                              {state === "listening" && "En écoute"}
                              {state === "processing" && "Traitement"}
                              {state === "result" && "Terminé"}
                            </h3>
                            <p className="text-xs text-custom-text-400">
                              {state === "listening" && formatTime(duration)}
                              {state === "processing" && "Réflexion..."}
                              {state === "result" && (intent ? INTENT_LABELS[intent] : "Prêt")}
                            </p>
                          </div>
                        </div>
                      )}

                      {state === "menu" && (
                        <div className="flex items-center gap-2.5">
                          <div className="relative w-9 h-9 rounded-[10px] flex items-center justify-center overflow-hidden bg-gradient-to-br from-custom-primary-100/20 to-custom-primary-200/20">
                            <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/20 to-transparent" />
                            <div className="absolute top-0 right-0 w-3 h-3 rounded-bl-lg blur-[2px] bg-white/30" />
                            <Mic className="w-4 h-4 relative z-10 text-custom-text-100" />
                          </div>
                          <div>
                            <h3 className="font-medium text-sm text-custom-text-100">Que veux-tu créer ?</h3>
                            <p className="text-xs text-custom-text-400">Choisis une option</p>
                          </div>
                        </div>
                      )}

                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          if (state === "listening") {
                            onStop();
                          } else {
                            onClose();
                          }
                        }}
                        className="relative w-8 h-8 rounded-lg border border-custom-border-200 flex items-center justify-center transition-colors bg-custom-background-90 hover:bg-custom-background-80 overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 w-2 h-2 rounded-bl-lg blur-[1px] bg-white/20" />
                        <MicOff className="w-4 h-4 relative z-10 text-custom-text-300" />
                      </motion.button>
                    </div>

                    <div className={cn("flex items-center justify-center", state === "menu" ? "min-h-[140px]" : "min-h-[35px]")}>
                      <AnimatePresence mode="wait">
                        {state === "menu" && (
                          <motion.div
                            key="menu"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3 }}
                            className="w-full space-y-2.5"
                          >
                            {INTENT_OPTIONS.map((action, index) => (
                              <motion.button
                                key={action.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.08, type: "spring", stiffness: 300, damping: 25 }}
                                whileHover={{ scale: 1.03, x: 6 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => onSelectIntent(action.id)}
                                onMouseEnter={() => setSelectedIndex(index)}
                                className={cn(
                                  "group relative w-full flex items-center gap-3.5 px-4 py-3 rounded-xl border transition-all overflow-hidden backdrop-blur-sm",
                                  selectedIndex === index
                                    ? "bg-custom-primary-100/10 border-custom-primary-100/30"
                                    : "bg-custom-background-90/50 hover:bg-custom-background-80 border-custom-border-200 hover:border-custom-border-300"
                                )}
                              >
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-transparent via-white/5 to-transparent" />

                                <div className="relative w-9 h-9 rounded-lg flex items-center justify-center text-base overflow-hidden bg-custom-background-80">
                                  <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/10 to-transparent" />
                                  <div className="absolute top-0 right-0 w-3 h-3 rounded-bl-lg blur-[2px] bg-white/20" />
                                  <span className="relative z-10">{action.icon}</span>
                                </div>

                                <span className="relative text-sm font-medium tracking-wide text-custom-text-100">
                                  {action.label}
                                </span>

                                <div className="ml-auto flex items-center gap-2">
                                  <span className="text-xs text-custom-text-400 font-mono">{index + 1}</span>
                                  <motion.span
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-custom-text-400"
                                    initial={{ x: -5 }}
                                    whileHover={{ x: 0 }}
                                  >
                                    →
                                  </motion.span>
                                </div>
                              </motion.button>
                            ))}
                          </motion.div>
                        )}

                        {state === "listening" && (
                          <motion.div
                            key="listening"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.3 }}
                            className="w-full"
                          >
                            <AudioVisualizer volume={volume} />
                          </motion.div>
                        )}

                        {state === "processing" && (
                          <motion.div
                            key="processing"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.3 }}
                            className="w-full"
                          >
                            <ProcessingAnimation />
                          </motion.div>
                        )}

                        {state === "result" && (
                          <motion.div
                            key="result"
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20, duration: 0.3 }}
                            className="w-full h-[35px] flex items-center justify-center"
                          >
                            <motion.div
                              className="w-12 h-12 rounded-full flex items-center justify-center bg-custom-primary-100/20"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.1 }}
                            >
                              <Check className="w-6 h-6 text-custom-primary-100" strokeWidth={2.5} />
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {state === "menu" && (
                      <div className="mt-4 pt-3 border-t border-custom-border-200 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-custom-text-400">
                          <span className="rounded bg-custom-background-80 px-1.5 py-0.5 font-mono">↑↓</span>
                          <span>naviguer</span>
                          <span className="rounded bg-custom-background-80 px-1.5 py-0.5 font-mono">↵</span>
                          <span>sélectionner</span>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};
