"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Mic, MicOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { TIntentType } from "@plane/services";
import { cn } from "@plane/utils";

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

const INTENT_LABELS: Record<TIntentType, string> = {
  todo: "Todo",
  note: "Note",
  long_text: "Document",
  planning: "Planning",
};

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const playStartSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
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
};

const playEndSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
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
};

interface AudioVisualizerProps {
  isDark: boolean;
  volume: number;
}

const AudioVisualizer = ({ isDark, volume }: AudioVisualizerProps) => {
  const bars = 28;
  const baseHeight = 7;
  const maxAdditionalHeight = 18;

  const seeds = useMemo(
    () =>
      Array.from({ length: bars }, () => ({
        phase: Math.random() * Math.PI * 2,
        speed: 0.9 + Math.random() * 0.9,
        amp: 0.75 + Math.random() * 0.5,
      })),
    []
  );

  const [barHeights, setBarHeights] = useState<number[]>(() => Array.from({ length: bars }, () => baseHeight));
  const animationRef = useRef<number>();
  const previousVolumeRef = useRef(0);

  useEffect(() => {
    const animate = (t: number) => {
      const now = t / 1000;
      const smoothVolume = previousVolumeRef.current + (volume - previousVolumeRef.current) * 0.25;
      previousVolumeRef.current = smoothVolume;

      const normalizedVolume = Math.min(100, Math.max(0, smoothVolume)) / 100;

      setBarHeights((prev) =>
        prev.map((current, i) => {
          const position = i / (bars - 1);
          const centerDistance = Math.abs(position - 0.5) * 2;
          const centerFactor = 0.45 + (1 - centerDistance) * 0.55;

          const wobble = 0.82 + 0.18 * Math.sin(now * seeds[i].speed + seeds[i].phase);
          const target = baseHeight + normalizedVolume * maxAdditionalHeight * centerFactor * seeds[i].amp * wobble;

          return current + (target - current) * 0.35;
        })
      );

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [volume, seeds]);

  return (
    <div className="flex items-center justify-center gap-[2px] h-[26px]">
      {barHeights.map((height, i) => {
        const position = i / (bars - 1);
        const centerDistance = Math.abs(position - 0.5) * 2;
        const opacity = 0.55 + (1 - centerDistance) * 0.45;

        return (
          <div
            key={i}
            className={cn(
              "w-[2px] rounded-full transition-[height,opacity] duration-75",
              isDark
                ? "bg-gradient-to-t from-white/35 via-white/65 to-white/90"
                : "bg-gradient-to-t from-slate-900/35 via-slate-900/65 to-slate-900/90"
            )}
            style={{
              height: `${Math.max(baseHeight, Math.min(baseHeight + maxAdditionalHeight, height))}px`,
              opacity,
            }}
          />
        );
      })}
    </div>
  );
};

const ProcessingAnimation = ({ isDark }: { isDark: boolean }) => (
  <div className="relative w-full h-[26px] flex items-center justify-center">
    <div className="flex gap-1">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={cn("w-1.5 h-1.5 rounded-full", isDark ? "bg-white/70" : "bg-slate-900/70")}
          animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.3, 0.8] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.25, ease: "easeInOut" }}
        />
      ))}
    </div>
  </div>
);

export interface VoiceAssistantOverlayProps {
  state: "menu" | "listening" | "processing" | "result";
  intent: TIntentType | null;
  duration: number;
  volume: number;
  onSelectIntent: (intent: TIntentType) => void;
  onStop: () => void;
  onClose: () => void;
}

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
  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");

  useEffect(() => {
    if (state === "menu") playStartSound();
    if (state === "result") playEndSound();
  }, [state]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (state === "menu") {
        switch (e.key) {
          case "ArrowLeft":
            e.preventDefault();
            setSelectedIndex((prev) => (prev > 0 ? prev - 1 : INTENT_OPTIONS.length - 1));
            break;
          case "ArrowRight":
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
            if (index >= 0 && index < INTENT_OPTIONS.length) onSelectIntent(INTENT_OPTIONS[index].id);
            break;
          }
        }
      }

      if (e.key === "Escape") {
        e.preventDefault();
        if (state === "listening") onStop();
        else {
          playEndSound();
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

  const headerTitle =
    state === "menu"
      ? "Que veux-tu créer ?"
      : state === "listening"
        ? "Écoute"
        : state === "processing"
          ? "Traitement"
          : "Terminé";

  const headerSubtitle =
    state === "menu"
      ? "Choisis une option"
      : state === "listening"
        ? formatTime(duration)
        : state === "processing"
          ? "Analyse"
          : intent
            ? INTENT_LABELS[intent]
            : "OK";

  const rightAction =
    state === "listening"
      ? { onClick: onStop, label: "Arrêter", icon: <MicOff className={cn("w-4 h-4", isDark ? "text-white/70" : "text-slate-700")} /> }
      : { onClick: onClose, label: "Fermer", icon: <MicOff className={cn("w-4 h-4", isDark ? "text-white/55" : "text-slate-600")} /> };

  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[100] pointer-events-none">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: -12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className="pointer-events-auto"
        >
          <div className="relative">
            <motion.div
              className={cn(
                "absolute -inset-2 rounded-[22px] blur-lg",
                isDark ? "bg-white/5" : "bg-slate-900/5"
              )}
              animate={{ opacity: state === "listening" ? [0.12, 0.22, 0.12] : state === "processing" ? [0.16, 0.26, 0.16] : 0.14 }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />

            <div
              className={cn(
                "relative border shadow-2xl overflow-hidden",
                "rounded-[18px]",
                isDark ? "bg-black/95 border-white/10" : "bg-white border-slate-200/70"
              )}
            >
              <div className={cn("absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent to-transparent", isDark ? "via-white/20" : "via-slate-900/10")} />

              <div className="flex items-center gap-3 px-3.5 py-2.5">
                <div className="flex items-center gap-2.5 min-w-[160px]">
                  <div
                    className={cn(
                      "relative w-8 h-8 rounded-[10px] flex items-center justify-center overflow-hidden",
                      isDark ? "bg-white/10" : "bg-slate-900/10"
                    )}
                  >
                    <div className={cn("absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b to-transparent", isDark ? "from-white/20" : "from-slate-900/15")} />
                    <div className={cn("absolute top-0 right-0 w-3 h-3 rounded-bl-lg blur-[2px]", isDark ? "bg-white/30" : "bg-slate-900/20")} />

                    {state === "result" ? (
                      <Check className={cn("w-4 h-4 relative z-10", isDark ? "text-white" : "text-slate-900")} />
                    ) : (
                      <Mic className={cn("w-4 h-4 relative z-10", isDark ? "text-white" : "text-slate-900")} />
                    )}
                  </div>

                  <div className="leading-tight">
                    <div className={cn("text-sm font-medium", isDark ? "text-white" : "text-slate-900")}>{headerTitle}</div>
                    <div className={cn("text-xs", isDark ? "text-white/45" : "text-slate-600")}>{headerSubtitle}</div>
                  </div>
                </div>

                <div className="flex-1">
                  <AnimatePresence mode="wait">
                    {state === "menu" && (
                      <motion.div
                        key="menu"
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        transition={{ duration: 0.15 }}
                        className="flex items-center gap-2"
                      >
                        {INTENT_OPTIONS.map((opt, idx) => (
                          <motion.button
                            key={opt.id}
                            whileHover={{ y: -1 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => onSelectIntent(opt.id)}
                            onMouseEnter={() => setSelectedIndex(idx)}
                            className={cn(
                              "group inline-flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors",
                              selectedIndex === idx
                                ? isDark
                                  ? "bg-white/15 border-white/25"
                                  : "bg-slate-900/10 border-slate-300"
                                : isDark
                                  ? "bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20"
                                  : "bg-slate-900/5 hover:bg-slate-900/10 border-slate-200 hover:border-slate-300"
                            )}
                          >
                            <span
                              className={cn(
                                "grid place-items-center w-7 h-7 rounded-lg",
                                isDark ? "bg-white/10" : "bg-slate-900/10"
                              )}
                            >
                              <span className="text-sm leading-none">{opt.icon}</span>
                            </span>
                            <span className={cn("text-sm font-medium", isDark ? "text-white" : "text-slate-900")}>{opt.label}</span>
                            <span className={cn("ml-1 text-[10px] font-mono", isDark ? "text-white/35" : "text-slate-500")}>{idx + 1}</span>
                          </motion.button>
                        ))}
                      </motion.div>
                    )}

                    {state === "listening" && (
                      <motion.div
                        key="listening"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        className="flex items-center justify-center"
                      >
                        <AudioVisualizer isDark={isDark} volume={volume} />
                      </motion.div>
                    )}

                    {state === "processing" && (
                      <motion.div
                        key="processing"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                      >
                        <ProcessingAnimation isDark={isDark} />
                      </motion.div>
                    )}

                    {state === "result" && (
                      <motion.div
                        key="result"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ type: "spring", stiffness: 320, damping: 18 }}
                        className="flex items-center justify-center"
                      >
                        <div className={cn("h-[26px] flex items-center", isDark ? "text-white/70" : "text-slate-700")}>
                          OK
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={rightAction.onClick}
                  aria-label={rightAction.label}
                  className={cn(
                    "relative w-9 h-9 rounded-xl border flex items-center justify-center transition-colors",
                    isDark
                      ? "bg-white/5 hover:bg-white/10 border-white/10"
                      : "bg-slate-900/5 hover:bg-slate-900/10 border-slate-200"
                  )}
                >
                  {rightAction.icon}
                </motion.button>
              </div>

              {state === "menu" && (
                <div
                  className={cn(
                    "px-3.5 pb-2.5 -mt-1 flex items-center justify-between",
                    isDark ? "text-white/30" : "text-slate-500"
                  )}
                >
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className={cn("rounded px-1.5 py-0.5 font-mono", isDark ? "bg-white/10" : "bg-slate-900/10")}>←→</span>
                    <span>naviguer</span>
                    <span className={cn("rounded px-1.5 py-0.5 font-mono", isDark ? "bg-white/10" : "bg-slate-900/10")}>↵</span>
                    <span>sélectionner</span>
                    <span className={cn("rounded px-1.5 py-0.5 font-mono", isDark ? "bg-white/10" : "bg-slate-900/10")}>Esc</span>
                    <span>fermer</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export interface FloatingIntentPickerProps {
  onSelect: (intent: TIntentType) => void;
  onClose: () => void;
}

export const FloatingIntentPicker = ({ onSelect, onClose }: FloatingIntentPickerProps) => (
  <VoiceAssistantOverlay
    state="menu"
    intent={null}
    duration={0}
    volume={0}
    onSelectIntent={onSelect}
    onStop={onClose}
    onClose={onClose}
  />
);
