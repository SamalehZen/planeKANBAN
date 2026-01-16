import { useState, useCallback, useRef } from "react";
import { SpeechService, type TIntentType } from "@plane/services";
import { useSpeechToText } from "./use-speech-to-text";

export interface UseIntentFirstSpeechOptions {
  workspaceSlug: string;
  onResult: (formattedContent: string, intent: TIntentType) => void;
  onError?: (error: Error) => void;
  onVolumeChange?: (volume: number) => void;
  onRecordingTime?: (seconds: number) => void;
}

export interface UseIntentFirstSpeechReturn {
  showIntentPicker: boolean;
  openIntentPicker: () => void;
  closeIntentPicker: () => void;
  selectedIntent: TIntentType | null;
  selectIntent: (intent: TIntentType) => void;
  isRecording: boolean;
  isConnecting: boolean;
  isProcessing: boolean;
  startWithIntent: (intent: TIntentType) => Promise<void>;
  stopAndProcess: () => void;
  recordingDuration: number;
  currentVolume: number;
}

const getFormattedContentByIntent = (
  result: {
    formatted_todo?: string;
    formatted_note?: string;
    formatted_planning?: string;
    formatted_long_text?: string;
    formatted_content: string;
  },
  intent: TIntentType
): string => {
  switch (intent) {
    case "todo":
      return result.formatted_todo || result.formatted_content;
    case "note":
      return result.formatted_note || result.formatted_content;
    case "planning":
      return result.formatted_planning || result.formatted_content;
    case "long_text":
      return result.formatted_long_text || result.formatted_content;
    default:
      return result.formatted_content;
  }
};

export const useIntentFirstSpeech = (options: UseIntentFirstSpeechOptions): UseIntentFirstSpeechReturn => {
  const { workspaceSlug, onResult, onError, onVolumeChange, onRecordingTime } = options;

  const [showIntentPicker, setShowIntentPicker] = useState(false);
  const [selectedIntent, setSelectedIntent] = useState<TIntentType | null>(null);
  const [isProcessingAI, setIsProcessingAI] = useState(false);

  const selectedIntentRef = useRef<TIntentType | null>(null);
  const accumulatedTranscriptRef = useRef<string>("");

  const handleTranscript = useCallback(
    async (text: string, isFinal: boolean) => {
      if (!isFinal) {
        accumulatedTranscriptRef.current = text;
        return;
      }

      const finalText = text.trim();
      if (!finalText) return;

      const intent = selectedIntentRef.current;
      if (!intent) {
        console.error("[IntentFirstSpeech] No intent selected");
        return;
      }

      setIsProcessingAI(true);

      try {
        const speechService = new SpeechService();
        const result = await speechService.processSmartTranscript(workspaceSlug, {
          transcript: finalText,
          language: "fr",
          intent,
        });

        const formattedContent = getFormattedContentByIntent(result, intent);
        onResult(formattedContent, intent);
      } catch (error) {
        console.error("[IntentFirstSpeech] Processing failed:", error);
        onResult(finalText, intent);
        onError?.(error instanceof Error ? error : new Error("Processing failed"));
      } finally {
        setIsProcessingAI(false);
        setSelectedIntent(null);
        selectedIntentRef.current = null;
        accumulatedTranscriptRef.current = "";
      }
    },
    [workspaceSlug, onResult, onError]
  );

  const {
    isRecording,
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
    onVolumeChange,
    onRecordingTime,
    disableSilenceDetection: true,
  });

  const openIntentPicker = useCallback(() => {
    setShowIntentPicker(true);
  }, []);

  const closeIntentPicker = useCallback(() => {
    setShowIntentPicker(false);
    setSelectedIntent(null);
    selectedIntentRef.current = null;
  }, []);

  const selectIntent = useCallback((intent: TIntentType) => {
    setSelectedIntent(intent);
    selectedIntentRef.current = intent;
  }, []);

  const startWithIntent = useCallback(
    async (intent: TIntentType) => {
      setSelectedIntent(intent);
      selectedIntentRef.current = intent;
      setShowIntentPicker(false);
      accumulatedTranscriptRef.current = "";
      await startRecording();
    },
    [startRecording]
  );

  const stopAndProcess = useCallback(() => {
    stopRecording();
  }, [stopRecording]);

  return {
    showIntentPicker,
    openIntentPicker,
    closeIntentPicker,
    selectedIntent,
    selectIntent,
    isRecording,
    isConnecting,
    isProcessing: hookIsProcessing || isProcessingAI,
    startWithIntent,
    stopAndProcess,
    recordingDuration,
    currentVolume,
  };
};
