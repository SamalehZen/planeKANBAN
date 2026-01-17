import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MicOff, Check, X, Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenerativeAI } from '@google/generative-ai';

export type ProcessingMode = 'auto' | 'email' | 'prompt' | 'message' | 'note' | 'voice' | 'document' | 'planning';
type VoiceState = 'idle' | 'loading' | 'menu' | 'listening' | 'processing' | 'result' | 'error';

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

const MODE_OPTIONS: { id: ProcessingMode; label: string; icon: string }[] = [
  { id: 'auto', label: 'Auto', icon: '✨' },
  { id: 'email', label: 'Email', icon: '📧' },
  { id: 'prompt', label: 'Prompt', icon: '🪄' },
  { id: 'message', label: 'Message', icon: '💬' },
  { id: 'note', label: 'Note', icon: '📝' },
  { id: 'voice', label: 'Texte', icon: '🎤' },
  { id: 'document', label: 'Doc', icon: '📄' },
  { id: 'planning', label: 'Planning', icon: '📅' },
];

const PROMPTS: Record<string, string> = {
  auto: `Détecte et traite. Réponds uniquement avec le texte traité.`,
  email: `Email pro: objet, intro, corps, politesse. Réponds uniquement avec l'email.`,
  prompt: `Prompt optimisé pour LLM. Réponds uniquement avec le prompt.`,
  message: `Corrige orthographe sans changer le sens. Réponds uniquement avec le texte corrigé.`,
  note: `Liste tâches avec ☐. Réponds uniquement avec la liste.`,
  document: `Document: titre, sections. Réponds uniquement avec le document.`,
  planning: `Planning par date/heure. Réponds uniquement avec le planning.`,
};

interface LLMConfig {
  api_key: string;
  model: string;
  provider: string;
}

const useThemeDetector = () => {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const checkTheme = () => {
      const html = document.documentElement;
      const isDarkMode = html.classList.contains("dark") || 
                         html.getAttribute("data-theme") === "dark" ||
                         html.style.colorScheme === "dark";
      setIsDark(isDarkMode);
    };

    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ["class", "data-theme", "style"] 
    });

    return () => observer.disconnect();
  }, []);

  return isDark;
};

const RealTimeWaveform = ({ isListening, isDark }: { isListening: boolean; isDark: boolean }) => {
  const BAR_COUNT = 32;
  const [data, setData] = useState<number[]>(new Array(BAR_COUNT).fill(4));
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isListening) return;

    const setupAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioContextClass();
        audioContextRef.current = ctx;
        
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.5;
        analyserRef.current = analyser;
        
        const source = ctx.createMediaStreamSource(stream);
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const tick = () => {
          analyser.getByteFrequencyData(dataArray);
          const bars = [];
          const halfCount = BAR_COUNT / 2;
          
          for (let i = 0; i < halfCount; i++) {
             const index = Math.floor(i * (bufferLength / 2) / halfCount);
             const value = dataArray[index];
             const height = Math.max(4, (value / 255) * 40);
             bars.push(height);
          }
          
          const mirrored = [...bars.slice().reverse(), ...bars];
          setData(mirrored);
          rafRef.current = requestAnimationFrame(tick);
        };
        
        tick();
      } catch (error) {
        console.error("Erreur micro:", error);
      }
    };

    setupAudio();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, [isListening]);

  return (
    <div className="flex items-center justify-center gap-[3px] h-12">
      {data.map((h, i) => (
        <motion.div
          key={i}
          className={isDark 
            ? "w-[3px] rounded-full bg-gradient-to-t from-white/40 via-white to-white/40" 
            : "w-[3px] rounded-full bg-gradient-to-t from-indigo-500/40 via-indigo-600 to-indigo-500/40"
          }
          animate={{ height: h }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        />
      ))}
    </div>
  );
};

const LoadingOrb = ({ isDark }: { isDark: boolean }) => (
  <div className="relative flex items-center justify-center w-full h-12">
    <div className="flex gap-2">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={`w-3 h-3 rounded-full blur-[1px] ${isDark ? "bg-white" : "bg-indigo-600"}`}
          animate={{
            scale: [0.8, 1.2, 0.8],
            opacity: [0.4, 1, 0.4],
          }}
          transition={{
            duration: 1.4,
            repeat: Infinity,
            delay: i * 0.2,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  </div>
);

export interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResult: (text: string) => void;
  language?: string;
  anchorRect?: DOMRect | null;
  workspaceSlug: string;
}

const llmConfigCache: { [slug: string]: LLMConfig } = {};

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({
  isOpen,
  onClose,
  onResult,
  language = "fr-FR",
  workspaceSlug,
}) => {
  const isDark = useThemeDetector();
  const [state, setState] = useState<VoiceState>("loading");
  const [selectedMode, setSelectedMode] = useState<ProcessingMode>("auto");
  const [timer, setTimer] = useState(0);
  const [liveText, setLiveText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [llmConfig, setLlmConfig] = useState<LLMConfig | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptRef = useRef("");

  const fetchLLMConfig = useCallback(async () => {
    if (!workspaceSlug) {
      console.error("[Voice] No workspaceSlug provided");
      setErrorMsg("Workspace non défini");
      setState("error");
      return;
    }

    if (llmConfigCache[workspaceSlug]) {
      setLlmConfig(llmConfigCache[workspaceSlug]);
      setState("menu");
      return;
    }

    try {
      const url = `/api/workspaces/${workspaceSlug}/llm-config/`;
      console.log("[Voice] Fetching LLM config from:", url);
      
      const response = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
      });

      console.log("[Voice] Response status:", response.status, response.statusText);

      const text = await response.text();
      console.log("[Voice] Raw response:", text.substring(0, 200));

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        let errMsg = "LLM non configuré";
        if (contentType?.includes("application/json")) {
          try {
            const error = JSON.parse(text);
            errMsg = error.error || error.detail || errMsg;
          } catch {
            errMsg = text || errMsg;
          }
        } else {
          errMsg = `Erreur ${response.status}: ${response.statusText}`;
        }
        throw new Error(errMsg);
      }

      const config: LLMConfig = JSON.parse(text);
      console.log("[Voice] LLM config received, provider:", config.provider, "model:", config.model);
      llmConfigCache[workspaceSlug] = config;
      setLlmConfig(config);
      setState("menu");
    } catch (err) {
      console.error("[Voice] Failed to fetch LLM config:", err);
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      setErrorMsg(msg);
      setState("error");
    }
  }, [workspaceSlug]);

  useEffect(() => {
    if (isOpen) {
      setLiveText("");
      setErrorMsg("");
      setTimer(0);
      
      if (llmConfig) {
        setState("menu");
      } else {
        setState("loading");
        fetchLLMConfig();
      }
    }
  }, [isOpen, llmConfig, fetchLLMConfig]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (state === 'listening') {
      interval = setInterval(() => setTimer(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [state]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  const processWithGemini = useCallback(async (text: string, mode: ProcessingMode) => {
    if (mode === 'voice' || !llmConfig) return { result: text };
    
    const genAI = new GoogleGenerativeAI(llmConfig.api_key);
    const model = genAI.getGenerativeModel({ model: llmConfig.model });
    const r = await model.generateContent(`${PROMPTS[mode]}\n\nTexte:"${text}"`);
    return { result: r.response.text() };
  }, [llmConfig]);

  const startRecording = useCallback((mode: ProcessingMode) => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setErrorMsg('Navigateur non supporté');
      setState('error');
      return;
    }

    setSelectedMode(mode);
    setErrorMsg('');
    setLiveText('');
    transcriptRef.current = '';

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) final += result[0].transcript;
        else interim += result[0].transcript;
      }
      if (final) transcriptRef.current += final;
      setLiveText(transcriptRef.current + interim);
    };

    recognition.onerror = (event: { error: string }) => {
      if (event.error !== 'no-speech') {
        setErrorMsg(event.error);
        setState('error');
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setState('listening');
    setTimer(0);
  }, [language]);

  const stopRecording = useCallback(async () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    const transcript = transcriptRef.current.trim();
    if (!transcript) {
      setState('menu');
      return;
    }

    setState('processing');

    try {
      const { result } = await processWithGemini(transcript, selectedMode);
      setState('result');
      setTimeout(() => {
        onResult(result);
        onClose();
      }, 1000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur IA';
      setErrorMsg(msg);
      setState('error');
    }
  }, [selectedMode, processWithGemini, onResult, onClose]);

  const handleClose = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    onClose();
  }, [onClose]);

  const formatTimer = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999]"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 40 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[10000] w-[360px]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className={`relative overflow-hidden rounded-[36px] border backdrop-blur-[50px] shadow-2xl transition-all duration-500 ${
            isDark 
              ? "bg-black/60 border-black shadow-black/50" 
              : "bg-white/70 border-white shadow-xl"
          }`}>
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            
            <div className="p-5">
              <div className="flex items-center justify-between mb-6 pl-1">
                <div className="flex items-center gap-3">
                  <motion.div 
                    layoutId="status-icon"
                    className={`flex items-center justify-center w-10 h-10 rounded-full shadow-inner ${
                      state === 'listening' ? "bg-red-500/10" : isDark ? "bg-white/10" : "bg-black/5"
                    }`}
                  >
                    {state === 'listening' ? (
                      <motion.div 
                        animate={{ scale: [1, 1.2, 1] }} 
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="w-3 h-3 bg-red-500 rounded-full shadow-[0_0_12px_rgba(239,68,68,0.8)]" 
                      />
                    ) : state === 'loading' ? (
                      <Loader2 className={`w-5 h-5 animate-spin ${isDark ? "text-white" : "text-black"}`} />
                    ) : (
                      <Sparkles className={`w-5 h-5 ${isDark ? "text-white" : "text-black"}`} />
                    )}
                  </motion.div>
                  
                  <div className="flex flex-col">
                    <motion.span 
                      layout
                      className={`text-sm font-semibold tracking-wide ${isDark ? "text-white" : "text-slate-900"}`}
                    >
                      {state === 'loading' && 'Chargement'}
                      {state === 'listening' && 'En écoute'}
                      {state === 'processing' && 'Traitement IA'}
                      {state === 'result' && 'Terminé'}
                      {state === 'menu' && 'Assistant'}
                      {state === 'error' && 'Erreur'}
                    </motion.span>
                    <motion.span 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className={`text-[11px] font-medium uppercase tracking-wider opacity-60 ${isDark ? "text-white" : "text-slate-900"}`}
                    >
                      {state === 'listening' ? formatTimer(timer) : state === 'menu' ? 'Sélectionner mode' : state === 'loading' ? 'Configuration...' : '...'}
                    </motion.span>
                  </div>
                </div>

                <button 
                  onClick={handleClose}
                  className={`p-2 rounded-full transition-all active:scale-95 ${
                    isDark ? "bg-white/10 hover:bg-white/20 text-white" : "bg-black/5 hover:bg-black/10 text-black"
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <AnimatePresence mode="wait">
                {state === 'loading' && (
                  <motion.div 
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="py-8 flex flex-col items-center"
                  >
                    <LoadingOrb isDark={isDark} />
                    <span className={`text-xs mt-4 opacity-50 ${isDark ? "text-white" : "text-black"}`}>
                      Connexion au serveur...
                    </span>
                  </motion.div>
                )}

                {state === 'menu' && (
                  <motion.div 
                    key="menu"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="grid grid-cols-4 gap-3"
                  >
                    {MODE_OPTIONS.map((mode, i) => (
                      <motion.button
                        key={mode.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.03 }}
                        whileTap={{ scale: 0.92 }}
                        onClick={() => startRecording(mode.id)}
                        className="flex flex-col items-center gap-2"
                      >
                        <div className={`w-14 h-14 rounded-[18px] flex items-center justify-center text-2xl transition-all shadow-sm border ${
                          isDark 
                            ? "bg-white/5 border-white/5 hover:bg-white/10" 
                            : "bg-white border-slate-100 hover:bg-slate-50 hover:shadow-md"
                        }`}>
                          {mode.icon}
                        </div>
                        <span className={`text-[10px] font-medium opacity-70 ${isDark ? "text-white" : "text-slate-900"}`}>
                          {mode.label}
                        </span>
                      </motion.button>
                    ))}
                  </motion.div>
                )}

                {state === 'listening' && (
                  <motion.div 
                    key="listening"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center w-full"
                  >
                    <div className="w-full h-16 flex items-center justify-center mb-2">
                      <RealTimeWaveform isListening={true} isDark={isDark} />
                    </div>
                    
                    <div className="w-full h-12 flex items-center justify-center px-4 mb-4">
                       <p className={`text-sm text-center line-clamp-2 leading-relaxed ${
                         isDark ? "text-white/80" : "text-slate-800"
                       }`}>
                         {liveText || "Parlez maintenant..."}
                       </p>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={stopRecording}
                      className="w-16 h-16 rounded-full bg-gradient-to-t from-red-600 to-red-500 shadow-lg shadow-red-500/30 flex items-center justify-center text-white"
                    >
                      <MicOff className="w-7 h-7" />
                    </motion.button>
                  </motion.div>
                )}

                {state === 'processing' && (
                  <motion.div key="processing" className="py-8 flex flex-col items-center">
                    <LoadingOrb isDark={isDark} />
                    <span className={`text-xs mt-4 opacity-50 ${isDark ? "text-white" : "text-black"}`}>
                      Gemini réfléchit...
                    </span>
                  </motion.div>
                )}

                {state === 'result' && (
                  <motion.div 
                    key="result"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="py-6 flex items-center justify-center"
                  >
                    <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/40">
                      <Check className="w-10 h-10 text-white" strokeWidth={3} />
                    </div>
                  </motion.div>
                )}
                
                {state === 'error' && (
                  <motion.div key="error" className="py-4 flex flex-col items-center text-center px-4">
                     <p className="text-red-500 text-sm mb-4 font-medium">{errorMsg}</p>
                     <button 
                       onClick={() => {
                         setLlmConfig(null);
                         delete llmConfigCache[workspaceSlug];
                         fetchLLMConfig();
                       }} 
                       className={`px-4 py-2 rounded-full text-xs font-semibold ${isDark ? "bg-white/10 text-white" : "bg-black/5 text-black"}`}
                     >
                       Réessayer
                     </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

VoiceAssistantModal.displayName = "VoiceAssistantModal";
