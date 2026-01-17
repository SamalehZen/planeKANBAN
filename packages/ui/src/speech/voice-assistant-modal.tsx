import { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { cn } from "../utils";

export type ProcessingMode = "auto" | "email" | "prompt" | "message" | "note" | "voice" | "document" | "planning";
type VoiceState = "idle" | "menu" | "listening" | "processing" | "result" | "error";

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
  { id: "auto", label: "Auto", icon: "✨" },
  { id: "email", label: "Email", icon: "📧" },
  { id: "prompt", label: "Prompt", icon: "🪄" },
  { id: "message", label: "Message", icon: "💬" },
  { id: "note", label: "Note", icon: "📝" },
  { id: "voice", label: "Texte", icon: "🎤" },
  { id: "document", label: "Doc", icon: "📄" },
  { id: "planning", label: "Planning", icon: "📅" },
];

const PROMPTS: Record<string, string> = {
  auto: `Détecte et traite. JSON: {"detectedMode":"email|prompt|message|note|document|planning","result":"..."}`,
  email: `Email pro: objet, intro, corps, politesse.`,
  prompt: `Prompt optimisé pour LLM.`,
  message: `Corrige orthographe sans changer le sens.`,
  note: `Liste tâches avec ☐.`,
  document: `Document: titre, sections.`,
  planning: `Planning par date/heure.`,
};

const AudioVisualizer = () => (
  <div className="flex items-center justify-center gap-[2px] h-8">
    {Array.from({ length: 35 }).map((_, i) => (
      <motion.div
        key={i}
        className="w-[3px] rounded-full bg-custom-primary-100"
        animate={{ height: [6, 24 - Math.abs(i - 17) * 0.6, 10, 28 - Math.abs(i - 17), 8] }}
        transition={{ duration: 1, repeat: Infinity, delay: i * 0.025 }}
      />
    ))}
  </div>
);

export interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResult: (text: string) => void;
  geminiApiKey?: string;
  language?: string;
  anchorRect?: DOMRect | null;
}

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({
  isOpen,
  onClose,
  onResult,
  geminiApiKey,
  language = "fr-FR",
  anchorRect,
}) => {
  const [state, setState] = useState<VoiceState>("menu");
  const [selectedMode, setSelectedMode] = useState<ProcessingMode>("auto");
  const [timer, setTimer] = useState(0);
  const [liveText, setLiveText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptRef = useRef("");

  useEffect(() => {
    if (isOpen) {
      setState("menu");
      setLiveText("");
      setErrorMsg("");
      setTimer(0);
    }
  }, [isOpen]);

  useEffect(() => {
    let i: ReturnType<typeof setInterval>;
    if (state === "listening") i = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => clearInterval(i);
  }, [state]);

  const processWithGemini = useCallback(
    async (text: string, mode: ProcessingMode) => {
      if (mode === "voice" || !geminiApiKey) return { result: text };

      const genAI = new GoogleGenerativeAI(geminiApiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const r = await model.generateContent(`${PROMPTS[mode]}\n\nTexte:"${text}"`);
      const res = r.response.text();

      if (mode === "auto") {
        try {
          const p = JSON.parse(res.replace(/```json\n?|\n?```/g, "").trim());
          return { result: p.result, detectedMode: p.detectedMode };
        } catch {
          return { result: res };
        }
      }
      return { result: res };
    },
    [geminiApiKey]
  );

  const startRecording = useCallback(
    (mode: ProcessingMode) => {
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;

      if (!SpeechRecognitionAPI) {
        setErrorMsg("Speech API non supporté");
        setState("error");
        return;
      }

      setSelectedMode(mode);
      setErrorMsg("");
      setLiveText("");
      transcriptRef.current = "";

      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interim = "";
        let final = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            final += result[0].transcript;
          } else {
            interim += result[0].transcript;
          }
        }

        if (final) {
          transcriptRef.current += final;
        }

        setLiveText(transcriptRef.current + interim);
      };

      recognition.onerror = (event: { error: string }) => {
        console.error("Speech error:", event.error);
        if (event.error !== "no-speech") {
          setErrorMsg(`Erreur: ${event.error}`);
          setState("error");
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
      setState("listening");
      setTimer(0);
    },
    [language]
  );

  const stopRecording = useCallback(async () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    const transcript = transcriptRef.current.trim();

    if (!transcript) {
      setState("menu");
      setLiveText("");
      return;
    }

    setState("processing");

    try {
      const { result } = await processWithGemini(transcript, selectedMode);

      setState("result");

      setTimeout(() => {
        onResult(result);
        onClose();
      }, 800);
    } catch (err) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : "Erreur Gemini");
      setState("error");
    }
  }, [selectedMode, processWithGemini, onResult, onClose]);

  const handleClose = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    onClose();
  }, [onClose]);

  const getModalPosition = () => {
    if (!anchorRect) {
      return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
    }
    return {
      top: anchorRect.bottom + 8,
      left: Math.max(8, anchorRect.left - 100),
    };
  };

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
          initial={{ opacity: 0, scale: 0.9, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -10 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed z-[10000] w-[300px]"
          style={getModalPosition()}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-custom-background-100 border border-custom-border-200 rounded-xl shadow-2xl overflow-hidden">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className={cn("w-8 h-8 rounded-lg flex items-center justify-center", {
                      "bg-green-500/20": state === "result",
                      "bg-custom-primary-100/20": state !== "result",
                    })}
                  >
                    {state === "result" ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Mic className="w-4 h-4 text-custom-primary-100" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-custom-text-100">
                      {state === "menu" && "Choisir le mode"}
                      {state === "listening" && `${Math.floor(timer / 60)}:${(timer % 60).toString().padStart(2, "0")}`}
                      {state === "processing" && "Traitement..."}
                      {state === "result" && "Terminé !"}
                      {state === "error" && "Erreur"}
                    </p>
                    {state === "error" && <p className="text-xs text-red-400">{errorMsg}</p>}
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="p-1.5 rounded-lg hover:bg-custom-background-80 transition-colors"
                >
                  <X className="w-4 h-4 text-custom-text-300" />
                </button>
              </div>

              <AnimatePresence mode="wait">
                {state === "menu" && (
                  <motion.div
                    key="menu"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="grid grid-cols-4 gap-1.5"
                  >
                    {MODE_OPTIONS.map((opt) => (
                      <motion.button
                        key={opt.id}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => startRecording(opt.id)}
                        className="flex flex-col items-center gap-0.5 p-2 rounded-lg hover:bg-custom-background-80 active:bg-custom-background-90 transition-colors"
                      >
                        <span className="text-lg">{opt.icon}</span>
                        <span className="text-[9px] text-custom-text-300">{opt.label}</span>
                      </motion.button>
                    ))}
                  </motion.div>
                )}

                {state === "listening" && (
                  <motion.div
                    key="listening"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="py-2"
                  >
                    <AudioVisualizer />
                    {liveText && (
                      <p className="text-xs mt-3 p-2 rounded-lg max-h-16 overflow-y-auto bg-custom-background-80 text-custom-text-200">
                        {liveText}
                      </p>
                    )}
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={stopRecording}
                      className="mt-4 mx-auto flex items-center justify-center w-14 h-14 rounded-full bg-red-500 text-white shadow-lg"
                    >
                      <MicOff className="w-6 h-6" />
                    </motion.button>
                  </motion.div>
                )}

                {state === "processing" && (
                  <motion.div
                    key="processing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="py-8 flex justify-center"
                  >
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-2.5 h-2.5 rounded-full bg-custom-primary-100"
                          animate={{ y: [0, -8, 0] }}
                          transition={{ duration: 0.4, repeat: Infinity, delay: i * 0.1 }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}

                {state === "result" && (
                  <motion.div
                    key="result"
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    className="py-6 flex justify-center"
                  >
                    <motion.div
                      className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", damping: 12 }}
                    >
                      <Check className="w-8 h-8 text-white" />
                    </motion.div>
                  </motion.div>
                )}

                {state === "error" && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="py-4 text-center"
                  >
                    <button
                      onClick={() => setState("menu")}
                      className="px-6 py-2.5 rounded-xl text-sm bg-custom-background-80 text-custom-text-100 hover:bg-custom-background-90 transition-colors"
                    >
                      Réessayer
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {!geminiApiKey && state === "menu" && (
                <p className="text-xs text-amber-500 mt-3 text-center">
                  ⚠️ Clé Gemini non configurée - Mode texte brut
                </p>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

VoiceAssistantModal.displayName = "VoiceAssistantModal";
