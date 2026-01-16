import { useState, useCallback, useRef } from "react";
import { SpeechService, type ISmartTranscriptResponse, type TIntentType } from "@plane/services";
import { useSpeechToText } from "./use-speech-to-text";

interface UseSmartSpeechToTextOptions {
  workspaceSlug: string;
  onResult?: (result: ISmartTranscriptResponse) => void;
  onIntentSelect?: (intent: TIntentType, content: string) => void;
  onError?: (error: Error) => void;
  silenceThreshold?: number;
  onVolumeChange?: (volume: number) => void;
  onRecordingTime?: (seconds: number) => void;
}

interface UseSmartSpeechToTextReturn {
  isRecording: boolean;
  isConnecting: boolean;
  isProcessing: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  recordingDuration: number;
  currentVolume: number;
  smartResult: ISmartTranscriptResponse | null;
  showIntentModal: boolean;
  selectIntent: (intent: TIntentType) => void;
  closeModal: () => void;
  getFormattedContent: (intent: TIntentType) => string;
}

export const useSmartSpeechToText = (options: UseSmartSpeechToTextOptions): UseSmartSpeechToTextReturn => {
  const {
    workspaceSlug,
    onResult,
    onIntentSelect,
    onError,
    silenceThreshold = 5000,
    onVolumeChange,
    onRecordingTime,
  } = options;

  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [smartResult, setSmartResult] = useState<ISmartTranscriptResponse | null>(null);
  const [showIntentModal, setShowIntentModal] = useState(false);
  const [externalIsRecording, setExternalIsRecording] = useState(false);
  
  const pendingTranscriptRef = useRef<string>("");

  const handleTranscript = useCallback(
    async (text: string, isFinal: boolean) => {
      if (!isFinal) {
        pendingTranscriptRef.current = text;
        return;
      }

      if (!text.trim()) return;

      setIsProcessingAI(true);

      try {
        const speechService = new SpeechService();
        const result = await speechService.processSmartTranscript(workspaceSlug, {
          transcript: text,
          language: "fr",
        });

        setSmartResult(result);
        onResult?.(result);
        setShowIntentModal(true);
      } catch (error) {
        console.error("[SmartSpeech] Processing failed:", error);
        const fallbackResult: ISmartTranscriptResponse = {
          intent: "note",
          confidence: 0.5,
          formatted_content: text,
          formatted_todo: text.split(/[.!?]/).filter(s => s.trim()).map(s => `- [ ] ${s.trim()}`).join('\n'),
          formatted_note: text,
          formatted_planning: text.split(/[.!?]/).filter(s => s.trim()).map(s => `- [ ] ${s.trim()} | priorité: moyenne`).join('\n'),
          formatted_long_text: `## Note vocale\n\n${text}`,
          original_transcript: text,
        };
        setSmartResult(fallbackResult);
        onResult?.(fallbackResult);
        setShowIntentModal(true);
      } finally {
        setIsProcessingAI(false);
        pendingTranscriptRef.current = "";
      }
    },
    [workspaceSlug, onResult]
  );

  const handleRecordingStateChange = useCallback((recording: boolean) => {
    setExternalIsRecording(recording);
  }, []);

  const {
    isRecording: hookIsRecording,
    isConnecting,
    isProcessing: hookIsProcessing,
    startRecording,
    stopRecording,
    recordingDuration,
    currentVolume,
  } = useSpeechToText({
    workspaceSlug,
    onTranscript: handleTranscript,
    onError,
    silenceThreshold,
    onVolumeChange,
    onRecordingTime,
    onRecordingStateChange: handleRecordingStateChange,
  });

  const getFormattedContent = useCallback(
    (intent: TIntentType): string => {
      if (!smartResult) return "";
      
      switch (intent) {
        case "todo":
          return smartResult.formatted_todo || smartResult.formatted_content;
        case "note":
          return smartResult.formatted_note || smartResult.formatted_content;
        case "planning":
          return smartResult.formatted_planning || smartResult.formatted_content;
        case "long_text":
          return smartResult.formatted_long_text || smartResult.formatted_content;
        default:
          return smartResult.formatted_content;
      }
    },
    [smartResult]
  );

  const selectIntent = useCallback(
    (intent: TIntentType) => {
      const content = getFormattedContent(intent);
      onIntentSelect?.(intent, content);
      setShowIntentModal(false);
      setSmartResult(null);
    },
    [getFormattedContent, onIntentSelect]
  );

  const closeModal = useCallback(() => {
    setShowIntentModal(false);
    setSmartResult(null);
  }, []);

  return {
    isRecording: hookIsRecording || externalIsRecording,
    isConnecting,
    isProcessing: hookIsProcessing || isProcessingAI,
    startRecording,
    stopRecording,
    recordingDuration,
    currentVolume,
    smartResult,
    showIntentModal,
    selectIntent,
    closeModal,
    getFormattedContent,
  };
};
