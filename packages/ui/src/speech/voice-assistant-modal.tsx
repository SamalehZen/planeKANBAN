import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MicOff, Check, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export type ProcessingMode = 'auto' | 'email' | 'prompt' | 'message' | 'note' | 'voice' | 'document' | 'planning';
type VoiceState = 'idle' | 'menu' | 'listening' | 'processing' | 'result' | 'error';

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

const STORAGE_MODE_KEY = 'plane_voice_last_mode';

const MODE_OPTIONS: { id: ProcessingMode; label: string; icon: string }[] = [
  { id: 'auto', label: 'Auto', icon: '✨' },
  { id: 'email', label: 'Email', icon: '📧' },
  { id: 'prompt', label: 'Prompt', icon: '🪄' },
  { id: 'message', label: 'Message', icon: '💬' },
  { id: 'note', label: 'Note', icon: '📝' },
  { id: 'voice', label: 'Brut', icon: '📋' },
  { id: 'document', label: 'Doc', icon: '📄' },
  { id: 'planning', label: 'Planning', icon: '📅' },
];

const FORMATTING_INSTRUCTIONS = `
Utilise le formatage HTML suivant pour enrichir le texte:
- Titres: <h1>, <h2>, <h3>, <h4>, <h5>, <h6>
- Liste numérotée: <ol><li>item</li></ol>
- Liste à puces: <ul><li>item</li></ul>
- Liste de tâches: <ul data-type="taskList"><li data-type="taskItem" data-checked="false">tâche</li></ul>
- Tableau: <table><tr><th>En-tête</th></tr><tr><td>Cellule</td></tr></table>
- Citation/Quote: <blockquote><p>texte cité</p></blockquote>
- Code: <code>code</code> ou <pre><code>bloc de code</code></pre>
- Callout: <div data-type="callout" data-color="blue">📌 Note importante</div>
- Séparateur: <hr>
- Gras: <strong>texte</strong>
- Italique: <em>texte</em>
- Couleur: <span style="color: #color">texte</span>
- Emoji: Utilise des emojis pertinents pour enrichir le texte (📝 ✅ ⚠️ 💡 🎯 📌 🔥 ⭐ 📅 👉 etc.)
`;

const PROMPTS: Record<string, string> = {
  auto: `Tu es un assistant de saisie vocale expert en formatage. Analyse le texte dicté et formate-le de manière appropriée en utilisant le formatage riche.
${FORMATTING_INSTRUCTIONS}
Détecte le type de contenu (liste, document, email, etc.) et applique le formatage adapté. Corrige les fautes. Réponds UNIQUEMENT avec le HTML formaté.`,
  
  email: `Transforme ce texte dicté en email professionnel formaté.
${FORMATTING_INSTRUCTIONS}
Structure: <h2>Objet: ...</h2>, puis paragraphes avec <p>, signature en <em>. Réponds UNIQUEMENT avec le HTML.`,
  
  prompt: `Transforme ce texte dicté en prompt optimisé pour LLM.
${FORMATTING_INSTRUCTIONS}
Utilise <h3> pour les sections, <ul> pour les contraintes, <blockquote> pour les exemples. Réponds UNIQUEMENT avec le HTML.`,
  
  message: `Corrige l'orthographe et la grammaire de ce texte dicté.
Garde le formatage simple avec <p> pour les paragraphes. Corrige sans changer le sens. Réponds UNIQUEMENT avec le HTML.`,
  
  note: `Transforme ce texte dicté en liste de tâches structurée.
${FORMATTING_INSTRUCTIONS}
Utilise <ul data-type="taskList"><li data-type="taskItem" data-checked="false">tâche</li></ul> pour les tâches.
Groupe par catégories avec <h3>. Réponds UNIQUEMENT avec le HTML.`,
  
  document: `Transforme ce texte dicté en document structuré et professionnel.
${FORMATTING_INSTRUCTIONS}
Utilise <h1> pour le titre, <h2> et <h3> pour les sections, <ul> ou <ol> pour les listes, <blockquote> pour les citations importantes, <table> si nécessaire. Réponds UNIQUEMENT avec le HTML.`,
  
  planning: `Transforme ce texte dicté en planning organisé.
${FORMATTING_INSTRUCTIONS}
Utilise <table> pour le planning avec colonnes Date/Heure/Tâche, ou <h3> pour chaque jour avec <ul data-type="taskList"> pour les tâches. Réponds UNIQUEMENT avec le HTML.`,
};

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
            : "w-[3px] rounded-full bg-gradient-to-t from-indigo-600 via-indigo-500 to-indigo-600"
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

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({
  isOpen,
  onClose,
  onResult,
  language = "fr-FR",
  workspaceSlug,
}) => {
  const isDark = useThemeDetector();
  const [state, setState] = useState<VoiceState>("menu");
  const [selectedMode, setSelectedMode] = useState<ProcessingMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_MODE_KEY);
      if (saved && MODE_OPTIONS.some(m => m.id === saved)) {
        return saved as ProcessingMode;
      }
    }
    return "auto";
  });
  const [timer, setTimer] = useState(0);
  const [liveText, setLiveText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptRef = useRef("");
  const liveTextRef = useRef("");

  useEffect(() => {
    if (isOpen) {
      setLiveText("");
      setErrorMsg("");
      setTimer(0);
      setState("menu");
    }
  }, [isOpen]);

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

  const processWithBackend = useCallback(async (text: string, mode: ProcessingMode) => {
    if (mode === 'voice') return { result: text };
    
    try {
      const prompt = `${PROMPTS[mode]}\n\nTexte:"${text}"`;
      console.log('[Backend] Sending request to AI with mode:', mode);
      
      const response = await fetch(`/api/workspaces/${workspaceSlug}/ai-assistant/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          task: 'voice_assistant',
          prompt: prompt,
        }),
      });

      const responseText = await response.text();
      console.log('[Backend] Response status:', response.status, 'Body:', responseText.substring(0, 200));
      
      if (!response.ok) {
        let errorMsg = 'Erreur serveur - IA non configurée';
        try {
          const errorData = JSON.parse(responseText);
          errorMsg = errorData.error || errorMsg;
          if (errorMsg.includes('API key') || errorMsg.includes('Configuration AI')) {
            errorMsg = 'Clé API non configurée. Allez dans Admin > AI Settings pour configurer MiMo.';
          }
        } catch {
        }
        console.error('[Backend] Server error:', errorMsg);
        throw new Error(errorMsg);
      }

      if (!responseText || responseText.trim() === '') {
        console.error('[Backend] Empty response from server');
        throw new Error('Réponse vide du serveur IA');
      }

      try {
        const data = JSON.parse(responseText);
        if (!data.response || data.response.trim() === '') {
          console.error('[Backend] Empty response field in JSON');
          throw new Error('Réponse IA vide - vérifiez la configuration');
        }
        console.log('[Backend] AI processed successfully, length:', data.response.length);
        return { result: data.response };
      } catch (parseError) {
        if (parseError instanceof SyntaxError) {
          console.warn('[Backend] Response is not JSON, using as text');
          return { result: responseText };
        }
        throw parseError;
      }
    } catch (error) {
      console.error('[Backend] Processing error:', error);
      throw error;
    }
  }, [workspaceSlug]);

  const startRecording = useCallback((mode: ProcessingMode) => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setErrorMsg('Navigateur non supporté');
      setState('error');
      return;
    }

    setSelectedMode(mode);
    localStorage.setItem(STORAGE_MODE_KEY, mode);
    setErrorMsg('');
    setLiveText('');
    transcriptRef.current = '';
    liveTextRef.current = '';

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    let isManualStop = false;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) final += result[0].transcript;
        else interim += result[0].transcript;
      }
      if (final) transcriptRef.current += final;
      const currentText = transcriptRef.current + interim;
      liveTextRef.current = currentText;
      setLiveText(currentText);
    };

    recognition.onerror = (event: { error: string }) => {
      console.warn('[Speech] Recognition error:', event.error);
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return;
      }
      if (event.error === 'network') {
        setErrorMsg('Erreur réseau - vérifiez votre connexion');
      } else {
        setErrorMsg(event.error);
      }
      setState('error');
    };

    recognition.onend = () => {
      if (!isManualStop && recognitionRef.current) {
        try {
          recognition.start();
        } catch (e) {
          console.warn('[Speech] Could not restart recognition:', e);
        }
      }
    };

    recognitionRef.current = recognition;
    (recognitionRef.current as any)._isManualStop = () => { isManualStop = true; };
    
    try {
      recognition.start();
      setState('listening');
      setTimer(0);
    } catch (e) {
      console.error('[Speech] Failed to start recognition:', e);
      setErrorMsg('Impossible de démarrer la reconnaissance vocale');
      setState('error');
    }
  }, [language]);

  const stopRecording = useCallback(async () => {
    if (recognitionRef.current) {
      const recognition = recognitionRef.current as any;
      if (recognition._isManualStop) {
        recognition._isManualStop();
      }
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    await new Promise(resolve => setTimeout(resolve, 150));

    const transcript = transcriptRef.current.trim() || liveTextRef.current.trim() || liveText.trim();
    console.log('[Speech] Final transcript:', transcript);
    
    if (!transcript) {
      setState('menu');
      return;
    }

    if (selectedMode === 'voice') {
      console.log('[Voice] Brut mode - calling onResult with:', transcript);
      setState('result');
      setTimeout(() => {
        try {
          onResult(transcript);
          console.log('[Voice] onResult called successfully');
        } catch (e) {
          console.error('[Voice] Error in onResult:', e);
        }
        onClose();
      }, 300);
      return;
    }

    setState('processing');

    try {
      const { result } = await processWithBackend(transcript, selectedMode);
      if (result && result.trim()) {
        console.log('[Voice] AI mode - calling onResult with:', result.substring(0, 100));
        setState('result');
        setTimeout(() => {
          try {
            onResult(result);
            console.log('[Voice] onResult called successfully');
          } catch (e) {
            console.error('[Voice] Error in onResult:', e);
          }
          onClose();
        }, 800);
      } else {
        setErrorMsg('Aucun résultat généré');
        setState('error');
      }
    } catch (err) {
      console.error('[Voice] Processing error:', err);
      const msg = err instanceof Error ? err.message : 'Erreur IA';
      setErrorMsg(msg);
      setState('error');
    }
  }, [selectedMode, processWithBackend, onResult, onClose, liveText]);

  const handleClose = useCallback(() => {
    if (recognitionRef.current) {
      const recognition = recognitionRef.current as any;
      if (recognition._isManualStop) {
        recognition._isManualStop();
      }
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    onClose();
  }, [onClose]);

  const formatTimer = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  if (!isOpen) return null;

  const dynamicIslandSpring = {
    type: "spring" as const,
    stiffness: 400,
    damping: 30,
    mass: 1,
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[9999] pointer-events-none"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: -10 }}
          transition={dynamicIslandSpring}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[10000] w-[360px] pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <motion.div 
            layout
            transition={dynamicIslandSpring}
            className={`relative overflow-hidden rounded-[32px] border backdrop-blur-[60px] ${
            isDark 
              ? "bg-black/80 border-white/10 shadow-2xl shadow-black/60" 
              : "bg-white/90 border-slate-200/60 shadow-xl shadow-slate-300/50"
          }`}>
            <div className={`absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent ${isDark ? "via-white/20" : "via-slate-300/50"} to-transparent`} />
            <div className={`absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent ${isDark ? "via-white/10" : "via-slate-200/50"} to-transparent`} />
            
            <div className="p-5">
              <div className="flex items-center justify-between mb-6 pl-1">
                <div className="flex items-center gap-3">
                  <motion.div 
                    layoutId="status-icon"
                    className={`flex items-center justify-center w-10 h-10 rounded-full ${
                      state === 'listening' 
                        ? "bg-red-500/10" 
                        : isDark 
                          ? "bg-white/10" 
                          : "bg-indigo-50 shadow-sm"
                    }`}
                  >
                    {state === 'listening' ? (
                      <motion.div 
                        animate={{ scale: [1, 1.2, 1] }} 
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="w-3 h-3 bg-red-500 rounded-full shadow-[0_0_12px_rgba(239,68,68,0.8)]" 
                      />
                    ) : (
                      <Sparkles className={`w-5 h-5 ${isDark ? "text-white" : "text-indigo-600"}`} />
                    )}
                  </motion.div>
                  
                  <div className="flex flex-col">
                    <motion.span 
                      layout
                      className={`text-sm font-semibold tracking-wide ${isDark ? "text-white" : "text-slate-900"}`}
                    >
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
                      {state === 'listening' ? formatTimer(timer) : state === 'menu' ? 'Sélectionner mode' : '...'}
                    </motion.span>
                  </div>
                </div>

                <button 
                  onClick={handleClose}
                  className={`p-2 rounded-full transition-all active:scale-95 ${
                    isDark ? "bg-white/10 hover:bg-white/20 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <AnimatePresence mode="popLayout">
                {state === 'menu' && (
                  <motion.div 
                    key="menu"
                    initial={{ opacity: 0, filter: "blur(10px)" }}
                    animate={{ opacity: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, filter: "blur(10px)" }}
                    transition={{ duration: 0.25 }}
                    className="space-y-3"
                  >
                    <div className="grid grid-cols-4 gap-3">
                      {MODE_OPTIONS.map((mode, i) => (
                        <motion.button
                          key={mode.id}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.03 }}
                          whileTap={{ scale: 0.92 }}
                          onClick={() => startRecording(mode.id)}
                          className="flex flex-col items-center gap-2"
                          title={mode.label}
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
                    </div>
                  </motion.div>
                )}

                {state === 'listening' && (
                  <motion.div 
                    key="listening"
                    initial={{ opacity: 0, filter: "blur(10px)" }}
                    animate={{ opacity: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, filter: "blur(10px)" }}
                    transition={{ duration: 0.25 }}
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
                  <motion.div 
                    key="processing" 
                    initial={{ opacity: 0, filter: "blur(10px)" }}
                    animate={{ opacity: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, filter: "blur(10px)" }}
                    transition={{ duration: 0.25 }}
                    className="py-8 flex flex-col items-center"
                  >
                    <LoadingOrb isDark={isDark} />
                    <span className={`text-xs mt-4 opacity-50 ${isDark ? "text-white" : "text-black"}`}>
                      IA réfléchit...
                    </span>
                  </motion.div>
                )}

                {state === 'result' && (
                  <motion.div 
                    key="result"
                    initial={{ scale: 0.8, opacity: 0, filter: "blur(10px)" }}
                    animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
                    exit={{ scale: 0.8, opacity: 0, filter: "blur(10px)" }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="py-6 flex items-center justify-center"
                  >
                    <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/40">
                      <Check className="w-10 h-10 text-white" strokeWidth={3} />
                    </div>
                  </motion.div>
                )}
                
                {state === 'error' && (
                  <motion.div 
                    key="error" 
                    initial={{ opacity: 0, filter: "blur(10px)" }}
                    animate={{ opacity: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, filter: "blur(10px)" }}
                    transition={{ duration: 0.25 }}
                    className="py-4 flex flex-col items-center text-center px-4"
                  >
                     <p className="text-red-500 text-sm mb-4 font-medium">{errorMsg}</p>
                     <button 
                       onClick={() => setState('menu')} 
                       className={`px-4 py-2 rounded-full text-xs font-semibold ${isDark ? "bg-white/10 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
                     >
                       Réessayer
                     </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

VoiceAssistantModal.displayName = "VoiceAssistantModal";
