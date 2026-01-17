"use client";

import React, { useCallback, useEffect, useRef, useMemo, useState } from "react";
import { Check, Mic, MicOff, Moon, Sun } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { TIntentType } from "@plane/services";
import { cn } from "@plane/utils";

// --- Sound Effects (from User Code) ---
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
    } catch (e) { }
};

const playEndSound = () => {
    try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        // Success sound: C5 -> E5
        oscillator.frequency.setValueAtTime(523, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(659, audioContext.currentTime + 0.12);
        gainNode.gain.setValueAtTime(0.25, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.15);
    } catch (e) { }
};

// --- Child Components (from User Code) ---

const AudioVisualizer = ({ isDark, volume = 0 }: { isDark: boolean, volume?: number }) => {
    // We combine the User's Visual Layout with Real Volume reactivity
    const bars = 50;
    
    // We create a stable set of "seeds" so the random base movement is consistent
    // (similar to original user code, but now we will modulate amplitude with volume)
    const seeds = useMemo(
        () => Array.from({ length: bars }, () => ({
            phase: Math.random() * Math.PI * 2,
            speed: 0.5 + Math.random() * 0.5,
            baseHeight: 4 + Math.random() * 8
        })),
        []
    );

    // We use a ref to animate smoothly
    const [barHeights, setBarHeights] = useState<number[]>(() => seeds.map(s => s.baseHeight));
    const animationRef = useRef<number>();
    const startTimeRef = useRef(Date.now());
    
    useEffect(() => {
        const animate = () => {
            const now = (Date.now() - startTimeRef.current) / 1000;
            const normalizedVolume = Math.min(100, Math.max(0, volume)) / 100; // 0 to 1
            
            // Map volume to additional height. 
            // If volume is 0, we just have the gentle "idle" wave from user code.
            // If volume is high, we boost the height significantly.
            
            const newHeights = seeds.map((seed, i) => {
                const position = i / bars;
                const centerDistance = Math.abs(position - 0.5) * 2;
                
                // Base idle animation (from user code logic: 4 + random*8)
                // We make it loop smoothly using sin/cos based on phase/speed
                const idleHeight = seed.baseHeight + Math.sin(now * seed.speed * 5 + seed.phase) * 2;
                
                // Volume impact: boosted in the center, less at edges
                const volumeBoost = normalizedVolume * 24 * (1 - centerDistance * 0.5); 
                
                // Final height calculation
                return Math.max(2, idleHeight + volumeBoost); 
            });
            
            setBarHeights(newHeights);
            animationRef.current = requestAnimationFrame(animate);
        };
        
        animationRef.current = requestAnimationFrame(animate);
        return () => {
            if(animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [volume, seeds]);


    return (
        <div className="flex items-center justify-center gap-[2px] h-12">
            {barHeights.map((height, i) => {
                const position = i / bars;
                const centerDistance = Math.abs(position - 0.5) * 2;
                // Add some flickering opacity based on height/volume for effect
                const opacity = 0.3 + (Math.min(height, 20) / 20) * 0.5;
                
                return (
                    <motion.div
                        key={i}
                        className={cn(
                            "w-[2px] rounded-full transition-all duration-75",
                            isDark ? "bg-white" : "bg-slate-900"
                        )}
                        style={{ height, opacity }}
                        // Removed Framer Motion "animate" prop here because we are driving it via JS requestAnimationFrame for better real-time audio sync
                    />
                );
            })}
        </div>
    );
};

const ProcessingAnimation = ({ isDark }: { isDark: boolean }) => {
    return (
        <div className="flex items-center justify-center gap-1.5 h-12">
            {[0, 1, 2].map((i) => (
                <motion.div
                    key={i}
                    className={cn(
                        "w-2 h-2 rounded-full",
                        isDark ? "bg-white" : "bg-slate-900"
                    )}
                    animate={{
                        y: [-4, 4, -4],
                        scale: [1, 1.2, 1],
                        opacity: [0.5, 1, 0.5]
                    }}
                    transition={{
                        duration: 1,
                        repeat: Infinity,
                        delay: i * 0.2,
                        ease: "easeInOut"
                    }}
                />
            ))}
        </div>
    );
};

// --- Main Component ---

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

    const [isDark, setIsDark] = useState(true);

    // Sync dark mode with system/document if needed, but user has a toggle.
    // We'll initialize from document but allow toggling.
    useEffect(() => {
        if (typeof document !== 'undefined') {
            setIsDark(document.documentElement.classList.contains('dark'));
        }
    }, []);

    useEffect(() => {
        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDark]);

    // Handle sounds based on state prop changes
    const prevStateRef = React.useRef(state);
    useEffect(() => {
        if (prevStateRef.current !== state) {
            if (state === 'menu') playStartSound();
            if (state === 'result') playEndSound();
            prevStateRef.current = state;
        }
    }, [state]);

    // Format time helper
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Keyboard handling
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
             if (e.key === 'Escape') {
                 if (state === 'listening') onStop();
                 else onClose();
             }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [state, onStop, onClose]);

    // Actions mock for menu
    const actions = [
        { id: 'todo', label: 'Todo', icon: '✓' },
        { id: 'note', label: 'Note', icon: '📝' },
        { id: 'long_text', label: 'Document', icon: '📄' }, // Mapped 'document' to 'long_text' to match TIntentType
        { id: 'planning', label: 'Planning', icon: '📅' },
    ];


    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center font-sans">
            {/* Animated background backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={cn(
                    "absolute inset-0 backdrop-blur-sm transition-colors duration-500",
                    isDark ? "bg-black/40" : "bg-white/40"
                )}
                onClick={onClose}
            />

            {/* Theme Toggle - Positioned absolutely relative to viewport */}
            <button
                onClick={(e) => { e.stopPropagation(); setIsDark(!isDark); }}
                className={cn(
                    "fixed top-6 right-6 z-50 p-3 rounded-xl border backdrop-blur-xl transition-colors",
                    isDark
                        ? "bg-black/80 border-white/10 text-white hover:bg-white/10"
                        : "bg-white/80 border-slate-200 text-slate-900 hover:bg-slate-100"
                )}
            >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>


            {/* Main Content */}
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
                className={cn(
                    "w-full max-w-md relative overflow-hidden",
                    "rounded-[32px] border shadow-2xl backdrop-blur-2xl transition-colors duration-500",
                    isDark
                        ? "bg-[#0A0A0A]/90 border-white/10 shadow-black/50"
                        : "bg-white/90 border-slate-200 shadow-xl"
                )}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Background Glow based on state */}
                <div className={cn(
                    "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px] opacity-20 transition-colors duration-1000 pointer-events-none",
                    state === 'listening' ? "bg-blue-500" :
                        state === 'processing' ? "bg-purple-500" :
                            state === 'result' ? "bg-emerald-500" :
                                "bg-blue-500"
                )} />

                {/* iOS-style light reflection */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />

                {/* Header / Body */}
                <div className="relative p-8 flex flex-col items-center justify-center min-h-[300px]">

                    <AnimatePresence mode="wait">
                        {state !== 'menu' && (
                            <motion.div
                                key="active-state"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="flex flex-col items-center gap-8 w-full"
                            >
                                {/* Visualizer Status */}
                                <div className="relative w-full h-32 flex items-center justify-center">
                                    {/* iOS-style reflection */}
                                    <div className={cn(
                                        "absolute inset-0 rounded-2xl opacity-20 blur-xl transition-colors duration-500",
                                        state === 'listening' ? "bg-blue-500" :
                                            state === 'processing' ? "bg-purple-500" :
                                                "bg-emerald-500"
                                    )} />

                                    {state === 'listening' && <AudioVisualizer isDark={isDark} volume={volume} />}
                                    {state === 'processing' && <ProcessingAnimation isDark={isDark} />}
                                    {state === 'result' && (
                                        <motion.div
                                            initial={{ scale: 0.5, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            className="p-4 rounded-full bg-emerald-500/20 text-emerald-500"
                                        >
                                            <Check className="w-12 h-12" />
                                        </motion.div>
                                    )}
                                </div>

                                {/* Status Text */}
                                <div className="space-y-2 text-center">
                                    <h2 className={cn(
                                        "text-2xl font-semibold tracking-tight",
                                        isDark ? "text-white" : "text-slate-900"
                                    )}>
                                        {state === 'listening' && 'Listening'}
                                        {state === 'processing' && 'Processing'}
                                        {state === 'result' && 'Complete'}
                                    </h2>
                                    <p className={cn(
                                        "text-lg font-medium font-mono tabular-nums opacity-60",
                                        isDark ? "text-white" : "text-slate-900"
                                    )}>
                                        {state === 'listening' && formatTime(duration)}
                                        {state === 'processing' && 'Thinking'}
                                        {state === 'result' && 'Ready'}
                                    </p>
                                </div>
                            </motion.div>
                        )}

                        {state === 'menu' && (
                            <motion.div
                                key="menu"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="w-full space-y-6"
                            >
                                <div className="text-center space-y-2">
                                    <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg shadow-blue-500/20 mb-4">
                                        <Mic className="w-8 h-8 text-white" />
                                    </div>
                                    <h2 className={cn(
                                        "text-2xl font-semibold",
                                        isDark ? "text-white" : "text-slate-900"
                                    )}>
                                        Que veux-tu créer ?
                                    </h2>
                                    <p className={cn(
                                        "text-base opacity-60",
                                        isDark ? "text-white" : "text-slate-900"
                                    )}>
                                        Choisis une option
                                    </p>
                                </div>

                                <div className="grid gap-2.5">
                                    {actions.map((action, index) => (
                                        <motion.button
                                            key={action.id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                            onClick={() => onSelectIntent(action.id as TIntentType)}
                                            className={cn(
                                                'group relative w-full flex items-center gap-3.5 px-4 py-3 rounded-xl border transition-all overflow-hidden backdrop-blur-sm',
                                                isDark
                                                    ? 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20'
                                                    : 'bg-slate-900/5 hover:bg-slate-900/10 border-slate-200 hover:border-slate-300'
                                            )}
                                        >
                                            {/* Hover glow effect */}
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />

                                            {/* Icon container with reflection */}
                                            <div className={cn(
                                                "w-10 h-10 rounded-lg flex items-center justify-center text-lg shadow-sm font-medium",
                                                isDark
                                                    ? "bg-gradient-to-br from-white/10 to-white/5 border border-white/10 text-white"
                                                    : "bg-white border border-slate-200 text-slate-700"
                                            )}>
                                                {action.icon}
                                            </div>

                                            {/* Label */}
                                            <span className={cn(
                                                "text-base font-medium flex-1 text-left",
                                                isDark ? "text-white" : "text-slate-900"
                                            )}>
                                                {action.label}
                                            </span>

                                            {/* Arrow indicator */}
                                            <span className={cn(
                                                "opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 text-xl",
                                                isDark ? "text-white/40" : "text-slate-400"
                                            )}>
                                                →
                                            </span>
                                        </motion.button>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer / Controls */}
                <div className={cn(
                    "p-4 border-t",
                    isDark ? "border-white/10 bg-white/5" : "border-slate-100 bg-slate-50/50"
                )}>
                    <div className="flex items-center justify-center gap-4">
                        <button
                            onClick={onClose}
                            className={cn(
                                "relative w-8 h-8 rounded-lg border flex items-center justify-center transition-colors overflow-hidden",
                                isDark
                                    ? "bg-white/5 hover:bg-white/10 border-white/10"
                                    : "bg-slate-900/5 hover:bg-slate-900/10 border-slate-200"
                            )}
                        >
                            <span className={cn("text-xs font-medium", isDark ? "text-white/60" : "text-slate-500")}>
                                ✕
                            </span>
                        </button>

                        {/* Indicator dots */}
                        <div className="flex gap-2">
                            {state === 'menu' && (
                                <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                            )}
                            {state === 'listening' && (
                                <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                            )}
                            {state === 'processing' && (
                                <div className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse" />
                            )}
                            {state === 'result' && (
                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            )}
                        </div>
                    </div>
                </div>
            </motion.div>
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
