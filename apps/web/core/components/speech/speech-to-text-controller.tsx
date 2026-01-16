"use client";

import { useCallback, useState, useEffect } from "react";
import { Mic } from "lucide-react";
import { useIntentFirstSpeech } from "@plane/hooks";
import { usePlatformOS } from "@plane/hooks";
import type { TIntentType } from "@plane/services";
import { cn } from "@plane/utils";
import { VoiceAssistantOverlay } from "./floating-intent-picker";
import { useSpeechShortcut } from "./speech-shortcut-handler";

export interface SpeechToTextControllerProps {
  workspaceSlug: string;
  onContentReady: (content: string, intent: TIntentType) => void;
  onError?: (error: Error) => void;
  className?: string;
  showMicButton?: boolean;
  enableShortcut?: boolean;
}

type VoiceAssistantState = "menu" | "listening" | "processing" | "result";

export const SpeechToTextController = ({
  workspaceSlug,
  onContentReady,
  onError,
  className,
  showMicButton = true,
  enableShortcut = true,
}: SpeechToTextControllerProps) => {
  const { isMobile } = usePlatformOS();
  const [isVisible, setIsVisible] = useState(false);
  const [uiState, setUiState] = useState<VoiceAssistantState>("menu");

  const handleResult = useCallback(
    (content: string, intent: TIntentType) => {
      setUiState("result");
      setTimeout(() => {
        setIsVisible(false);
        setUiState("menu");
        onContentReady(content, intent);
      }, 1500);
    },
    [onContentReady]
  );

  const speech = useIntentFirstSpeech({
    workspaceSlug,
    onResult: handleResult,
    onError,
  });

  useEffect(() => {
    if (speech.isRecording) {
      setUiState("listening");
    } else if (speech.isProcessing) {
      setUiState("processing");
    }
  }, [speech.isRecording, speech.isProcessing]);

  const handleOpen = useCallback(() => {
    setIsVisible(true);
    setUiState("menu");
  }, []);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    setUiState("menu");
    speech.closeIntentPicker();
  }, [speech]);

  const handleIntentSelect = useCallback(
    async (intent: TIntentType) => {
      setUiState("listening");
      await speech.startWithIntent(intent);
    },
    [speech]
  );

  const handleStop = useCallback(() => {
    speech.stopAndProcess();
    setUiState("processing");
  }, [speech]);

  useSpeechShortcut(handleOpen, enableShortcut && !isVisible);

  const isIpad =
    typeof navigator !== "undefined" &&
    (navigator.userAgent.toLowerCase().includes("ipad") ||
      (navigator.userAgent.toLowerCase().includes("macintosh") && "ontouchend" in document));

  const shouldShowMicButton = showMicButton && (isMobile || isIpad);

  return (
    <>
      {shouldShowMicButton && (
        <button
          onClick={handleOpen}
          disabled={speech.isRecording || speech.isConnecting || speech.isProcessing}
          className={cn(
            "flex items-center justify-center rounded-md p-2 transition-colors",
            "text-custom-text-300 hover:bg-custom-background-80 hover:text-custom-text-100",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            className
          )}
          title="Enregistrement vocal (F2 ou Cmd+Shift+V)"
        >
          <Mic className="size-5" />
        </button>
      )}

      {isVisible && (
        <VoiceAssistantOverlay
          state={uiState}
          intent={speech.selectedIntent}
          duration={speech.recordingDuration}
          volume={speech.currentVolume}
          onSelectIntent={handleIntentSelect}
          onStop={handleStop}
          onClose={handleClose}
        />
      )}
    </>
  );
};
