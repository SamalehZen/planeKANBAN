import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square } from 'lucide-react';
import { DynamicNotch } from './DynamicNotch';
import { UIState } from './types';

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
  
  brut: ``,
  
  doc: `Transforme ce texte dicté en document structuré et professionnel.
${FORMATTING_INSTRUCTIONS}
Utilise <h1> pour le titre, <h2> et <h3> pour les sections, <ul> ou <ol> pour les listes, <blockquote> pour les citations importantes, <table> si nécessaire. Réponds UNIQUEMENT avec le HTML.`,
  
  planning: `Transforme ce texte dicté en planning organisé.
${FORMATTING_INSTRUCTIONS}
Utilise <table> pour le planning avec colonnes Date/Heure/Tâche, ou <h3> pour chaque jour avec <ul data-type="taskList"> pour les tâches. Réponds UNIQUEMENT avec le HTML.`,

  weather: `Analyse la demande météo et réponds de manière concise avec les informations demandées. Réponds UNIQUEMENT avec le HTML formaté.`,
};

export interface DynamicNotchControllerProps {
  onTranscript?: (text: string, isProcessed: boolean) => void;
  onError?: (error: string) => void;
  theme?: 'light' | 'dark' | 'auto';
  language?: string;
  workspaceSlug?: string;
  disabled?: boolean;
  showFloatingButton?: boolean;
}

const useThemeDetector = (): 'light' | 'dark' => {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const checkTheme = () => {
      const html = document.documentElement;
      const body = document.body;
      
      const isDarkMode = 
        html.classList.contains("dark") ||
        body.classList.contains("dark") ||
        html.getAttribute("data-theme") === "dark" ||
        body.getAttribute("data-theme") === "dark" ||
        html.style.colorScheme === "dark" ||
        document.querySelector('[data-theme="dark"]') !== null ||
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      setTheme(isDarkMode ? 'dark' : 'light');
    };

    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ["class", "data-theme", "style"],
      subtree: true
    });
    observer.observe(document.body, { 
      attributes: true, 
      attributeFilter: ["class", "data-theme", "style"] 
    });

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', checkTheme);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', checkTheme);
    };
  }, []);

  return theme;
};

const snappySpring = {
  type: "spring" as const,
  stiffness: 500,
  damping: 35,
  mass: 0.5
};

export const DynamicNotchController: React.FC<DynamicNotchControllerProps> = ({
  onTranscript,
  onError,
  theme = 'auto',
  language = 'fr-FR',
  workspaceSlug,
  disabled = false,
  showFloatingButton = true,
}) => {
  const detectedTheme = useThemeDetector();
  const actualTheme: 'light' | 'dark' = theme === 'auto' ? detectedTheme : theme;
  const isLight = actualTheme === 'light';
  
  const [isVisible, setIsVisible] = useState(false);
  const [uiState, setUiState] = useState<UIState>(UIState.IDLE);
  const [selectedMode, setSelectedMode] = useState<string | null>(null);

  const lastCtrlPressRef = useRef<number>(0);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptRef = useRef('');

  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        const now = Date.now();
        const timeSinceLastPress = now - lastCtrlPressRef.current;

        if (timeSinceLastPress < 300) {
          handleDoubleTap();
        }
        lastCtrlPressRef.current = now;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [uiState, isVisible, disabled]);

  const processWithAI = useCallback(async (text: string, mode: string): Promise<string> => {
    if (mode === 'brut' || !workspaceSlug) {
      return text;
    }

    const prompt = PROMPTS[mode];
    if (!prompt) {
      return text;
    }

    try {
      const response = await fetch(`/api/workspaces/${workspaceSlug}/ai-assistant/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          task: 'voice_assistant',
          prompt: `${prompt}\n\nTexte: "${text}"`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erreur serveur IA');
      }

      const data = await response.json();
      return data.response || text;
    } catch (error) {
      console.error('[DynamicNotch] AI processing error:', error);
      throw error;
    }
  }, [workspaceSlug]);

  const handleDoubleTap = useCallback(() => {
    if (disabled) return;
    
    if (!isVisible) {
      setIsVisible(true);
      setUiState(UIState.IDLE);
      transcriptRef.current = '';
      setTimeout(() => {
        setUiState(UIState.MODE_SELECT);
      }, 200);
    } else if (uiState === UIState.LISTENING) {
      stopRecording();
    }
  }, [isVisible, uiState, disabled]);

  const startRecording = useCallback((mode: string) => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      onError?.('Speech recognition not supported');
      setUiState(UIState.IDLE);
      return;
    }

    setSelectedMode(mode);
    transcriptRef.current = '';

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = language;

    let isManualStop = false;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          transcriptRef.current += result[0].transcript;
        }
      }
    };

    recognition.onerror = (event: { error: string }) => {
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return;
      }
      onError?.(event.error);
    };

    recognition.onend = () => {
      if (!isManualStop && recognitionRef.current) {
        try {
          recognition.start();
        } catch (e) {
          console.warn('[DynamicNotch] Could not restart:', e);
        }
      }
    };

    recognitionRef.current = recognition;
    (recognitionRef.current as any)._isManualStop = () => { isManualStop = true; };

    try {
      recognition.start();
      setUiState(UIState.LISTENING);
    } catch (e) {
      onError?.('Failed to start recognition');
    }
  }, [language, onError]);

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

    const transcript = transcriptRef.current.trim();
    
    if (!transcript) {
      setUiState(UIState.MODE_SELECT);
      return;
    }

    if (selectedMode === 'brut' || !workspaceSlug) {
      onTranscript?.(transcript, false);
      setUiState(UIState.IDLE);
      hideTimeoutRef.current = setTimeout(() => {
        setIsVisible(false);
        setSelectedMode(null);
      }, 1500);
      return;
    }

    setUiState(UIState.THINKING);

    try {
      const processed = await processWithAI(transcript, selectedMode || 'auto');
      onTranscript?.(processed, true);
      setUiState(UIState.IDLE);
      hideTimeoutRef.current = setTimeout(() => {
        setIsVisible(false);
        setSelectedMode(null);
      }, 1500);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erreur IA';
      onError?.(msg);
      onTranscript?.(transcript, false);
      setUiState(UIState.IDLE);
      hideTimeoutRef.current = setTimeout(() => {
        setIsVisible(false);
        setSelectedMode(null);
      }, 3000);
    }
  }, [selectedMode, workspaceSlug, processWithAI, onTranscript, onError]);

  const handleModeSelect = useCallback((modeId: string) => {
    startRecording(modeId);
  }, [startRecording]);

  const handleMicClick = useCallback(() => {
    if (disabled) return;
    setIsVisible(true);
    setUiState(UIState.IDLE);
    transcriptRef.current = '';
    setTimeout(() => {
      setUiState(UIState.MODE_SELECT);
    }, 200);
  }, [disabled]);

  const handleStopClick = useCallback(() => {
    stopRecording();
  }, [stopRecording]);

  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  if (disabled) return null;

  return (
    <>
      <AnimatePresence>
        {isVisible && (
          <DynamicNotch
            uiState={uiState}
            selectedMode={selectedMode}
            theme={actualTheme}
            onModeSelect={handleModeSelect}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showFloatingButton && !isVisible && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            transition={snappySpring}
            onClick={handleMicClick}
            className={`fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full backdrop-blur-xl flex items-center justify-center shadow-lg ${
              isLight
                ? 'bg-white/90 border border-black/10 shadow-black/15'
                : 'bg-[#1A1A1A]/90 border border-white/10 shadow-black/50'
            }`}
          >
            <Mic className={`w-6 h-6 ${isLight ? 'text-zinc-700' : 'text-white'}`} />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isVisible && uiState === UIState.LISTENING && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            transition={snappySpring}
            onClick={handleStopClick}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/40"
            style={{
              animation: 'pulse-glow 2s ease-in-out infinite',
            }}
          >
            <Square className="w-6 h-6 text-white" fill="white" />
          </motion.button>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(239, 68, 68, 0.4), 0 10px 40px rgba(239, 68, 68, 0.3);
          }
          50% {
            box-shadow: 0 0 30px rgba(239, 68, 68, 0.6), 0 10px 50px rgba(239, 68, 68, 0.4);
          }
        }
      `}</style>
    </>
  );
};

export type { SpeechRecognition, SpeechRecognitionEvent };
