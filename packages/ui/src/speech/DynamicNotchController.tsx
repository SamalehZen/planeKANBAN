import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff } from 'lucide-react';
import { DynamicNotch, MODES } from './DynamicNotch';
import { UIState, ProcessingMode } from './types';

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
  
  doc: `Transforme ce texte dicté en document structuré et professionnel.
${FORMATTING_INSTRUCTIONS}
Utilise <h1> pour le titre, <h2> et <h3> pour les sections, <ul> ou <ol> pour les listes, <blockquote> pour les citations importantes, <table> si nécessaire. Réponds UNIQUEMENT avec le HTML.`,
  
  planning: `Transforme ce texte dicté en planning organisé.
${FORMATTING_INSTRUCTIONS}
Utilise <table> pour le planning avec colonnes Date/Heure/Tâche, ou <h3> pour chaque jour avec <ul data-type="taskList"> pour les tâches. Réponds UNIQUEMENT avec le HTML.`,
};

const DOUBLE_CTRL_DELAY = 300;
const IDLE_BLINK_DURATION = 2000;
const IDLE_DISPLAY_AFTER_RESULT = 3000;

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

const useTouchDevice = () => {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const checkTouch = () => {
      const hasTouch = 'ontouchstart' in window || 
                       navigator.maxTouchPoints > 0 ||
                       (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
      setIsTouchDevice(hasTouch);
    };

    checkTouch();
    window.addEventListener('resize', checkTouch);
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  return isTouchDevice;
};

export interface DynamicNotchControllerProps {
  onResult: (text: string) => void;
  language?: string;
  workspaceSlug: string;
  enabled?: boolean;
}

export const DynamicNotchController: React.FC<DynamicNotchControllerProps> = ({
  onResult,
  language = "fr-FR",
  workspaceSlug,
  enabled = true,
}) => {
  const isDark = useThemeDetector();
  const isTouchDevice = useTouchDevice();
  const [isVisible, setIsVisible] = useState(false);
  const [uiState, setUiState] = useState<UIState>(UIState.IDLE);
  const [selectedMode, setSelectedMode] = useState<string | null>(null);
  
  const lastCtrlPressRef = useRef<number>(0);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptRef = useRef("");
  const idleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blinkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const processWithBackend = useCallback(async (text: string, mode: ProcessingMode) => {
    if (mode === 'brut') return { result: text };
    
    try {
      const prompt = `${PROMPTS[mode]}\n\nTexte:"${text}"`;
      
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
      
      if (!response.ok) {
        let errorMsg = 'Erreur serveur - IA non configurée';
        try {
          const errorData = JSON.parse(responseText);
          errorMsg = errorData.error || errorMsg;
        } catch {}
        throw new Error(errorMsg);
      }

      if (!responseText || responseText.trim() === '') {
        throw new Error('Réponse vide du serveur IA');
      }

      try {
        const data = JSON.parse(responseText);
        if (!data.response || data.response.trim() === '') {
          throw new Error('Réponse IA vide');
        }
        return { result: data.response };
      } catch (parseError) {
        if (parseError instanceof SyntaxError) {
          return { result: responseText };
        }
        throw parseError;
      }
    } catch (error) {
      console.error('[DynamicNotch] Processing error:', error);
      throw error;
    }
  }, [workspaceSlug]);

  const clearTimeouts = useCallback(() => {
    if (idleTimeoutRef.current) {
      clearTimeout(idleTimeoutRef.current);
      idleTimeoutRef.current = null;
    }
    if (blinkTimeoutRef.current) {
      clearTimeout(blinkTimeoutRef.current);
      blinkTimeoutRef.current = null;
    }
  }, []);

  const hideNotch = useCallback(() => {
    clearTimeouts();
    setIsVisible(false);
    setUiState(UIState.IDLE);
    setSelectedMode(null);
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }, [clearTimeouts]);

  const showIdleAndMenu = useCallback(() => {
    setIsVisible(true);
    setUiState(UIState.IDLE);
    setSelectedMode(null);
    
    blinkTimeoutRef.current = setTimeout(() => {
      setUiState(UIState.MODE_SELECT);
    }, IDLE_BLINK_DURATION);
  }, []);

  const startRecording = useCallback((mode: string) => {
    setSelectedMode(mode);
    setUiState(UIState.LISTENING);
    transcriptRef.current = '';

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      console.error('[DynamicNotch] Speech recognition not supported');
      hideNotch();
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    let isManualStop = false;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) final += result[0].transcript;
      }
      if (final) transcriptRef.current += final;
    };

    recognition.onerror = (event: { error: string }) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      console.error('[DynamicNotch] Recognition error:', event.error);
    };

    recognition.onend = () => {
      if (!isManualStop && recognitionRef.current) {
        try {
          recognition.start();
        } catch {}
      }
    };

    recognitionRef.current = recognition;
    (recognitionRef.current as any)._isManualStop = () => { isManualStop = true; };
    
    try {
      recognition.start();
    } catch (e) {
      console.error('[DynamicNotch] Failed to start recognition:', e);
      hideNotch();
    }
  }, [language, hideNotch]);

  const stopRecordingAndProcess = useCallback(async () => {
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
      hideNotch();
      return;
    }

    setUiState(UIState.THINKING);

    try {
      const mode = selectedMode as ProcessingMode || 'auto';
      const { result } = await processWithBackend(transcript, mode);
      
      if (result && result.trim()) {
        onResult(result);
        
        setUiState(UIState.IDLE);
        idleTimeoutRef.current = setTimeout(() => {
          hideNotch();
        }, IDLE_DISPLAY_AFTER_RESULT);
      } else {
        hideNotch();
      }
    } catch (error) {
      console.error('[DynamicNotch] Processing failed:', error);
      hideNotch();
    }
  }, [selectedMode, processWithBackend, onResult, hideNotch]);

  const handleTrigger = useCallback(() => {
    if (!isVisible) {
      showIdleAndMenu();
    } else if (uiState === UIState.LISTENING) {
      stopRecordingAndProcess();
    } else if (uiState === UIState.MODE_SELECT || uiState === UIState.IDLE) {
      hideNotch();
    }
  }, [isVisible, uiState, showIdleAndMenu, stopRecordingAndProcess, hideNotch]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control' && !e.repeat) {
        const now = Date.now();
        const timeSinceLastCtrl = now - lastCtrlPressRef.current;
        
        if (timeSinceLastCtrl < DOUBLE_CTRL_DELAY) {
          e.preventDefault();
          handleTrigger();
          lastCtrlPressRef.current = 0;
        } else {
          lastCtrlPressRef.current = now;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleTrigger]);

  useEffect(() => {
    return () => {
      clearTimeouts();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [clearTimeouts]);

  const handleModeSelect = useCallback((mode: string) => {
    startRecording(mode);
  }, [startRecording]);

  const handleNotchClick = useCallback(() => {
    if (uiState === UIState.LISTENING) {
      stopRecordingAndProcess();
    }
  }, [uiState, stopRecordingAndProcess]);

  return (
    <>
      {isTouchDevice && (!isVisible || uiState === UIState.LISTENING) && (
        <motion.button
          key={uiState === UIState.LISTENING ? 'stop' : 'start'}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          whileTap={{ scale: 0.9 }}
          onClick={uiState === UIState.LISTENING ? stopRecordingAndProcess : handleTrigger}
          className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg backdrop-blur-xl
            ${uiState === UIState.LISTENING
              ? 'bg-red-500 border border-red-400 shadow-red-500/30'
              : isDark 
                ? 'bg-[#121212]/90 border border-white/10 shadow-black/50' 
                : 'bg-white/90 border border-black/5 shadow-black/20'
            }`}
          style={{
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {uiState === UIState.LISTENING ? (
            <MicOff className="w-6 h-6 text-white" />
          ) : (
            <Mic className={`w-6 h-6 ${isDark ? 'text-white' : 'text-zinc-800'}`} />
          )}
        </motion.button>
      )}

      <AnimatePresence>
        {isVisible && (
          <div onClick={handleNotchClick}>
            <DynamicNotch
              uiState={uiState}
              selectedMode={selectedMode}
              theme={isDark ? 'dark' : 'light'}
              onModeSelect={handleModeSelect}
            />
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

DynamicNotchController.displayName = 'DynamicNotchController';
