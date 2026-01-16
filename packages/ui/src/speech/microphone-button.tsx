import { Loader2, Mic, MicOff } from "lucide-react";
import * as React from "react";
import { useState, useCallback } from "react";
import { useSpeechToText } from "@plane/hooks";
import { cn } from "../utils";
import { Tooltip } from "../tooltip";
import { RecordingIndicator } from "./recording-indicator";

type TButtonSize = "sm" | "md" | "lg";

export interface MicrophoneButtonProps {
  workspaceSlug: string;
  onTranscript: (text: string) => void;
  onError?: (error: Error) => void;
  className?: string;
  size?: TButtonSize;
  disabled?: boolean;
  tooltipPosition?: "top" | "bottom" | "left" | "right";
  showRecordingIndicator?: boolean;
  silenceThreshold?: number;
}

const SIZE_CLASSES: Record<TButtonSize, string> = {
  sm: "size-6",
  md: "size-8",
  lg: "size-10",
};

const ICON_SIZE_CLASSES: Record<TButtonSize, string> = {
  sm: "size-3.5",
  md: "size-4",
  lg: "size-5",
};

export const MicrophoneButton: React.FC<MicrophoneButtonProps> = ({
  workspaceSlug,
  onTranscript,
  onError,
  className,
  size = "md",
  disabled = false,
  tooltipPosition = "top",
  showRecordingIndicator = true,
  silenceThreshold = 5000,
}) => {
  const [localInterimText, setLocalInterimText] = useState("");
  const [volume, setVolume] = useState(0);
  const [duration, setDuration] = useState(0);

  const handleTranscript = useCallback(
    (text: string, isFinal: boolean) => {
      if (isFinal) {
        onTranscript(text);
        setLocalInterimText("");
      } else {
        setLocalInterimText(text);
      }
    },
    [onTranscript]
  );

  const { isRecording, isConnecting, isProcessing, startRecording, stopRecording, recordingDuration, currentVolume } = useSpeechToText({
    workspaceSlug,
    onTranscript: handleTranscript,
    onError,
    silenceThreshold,
    onVolumeChange: setVolume,
    onRecordingTime: setDuration,
  });

  const handleClick = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const tooltipContent = isConnecting
    ? "Connexion..."
    : isProcessing
      ? "Traitement..."
      : isRecording
        ? "Arrêter l'enregistrement"
        : "Démarrer la saisie vocale";

  return (
    <div className="relative inline-flex items-center">
      <Tooltip tooltipContent={tooltipContent} position={tooltipPosition}>
        <button
          type="button"
          onClick={handleClick}
          disabled={disabled || isConnecting || isProcessing}
          className={cn(
            "grid place-items-center rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1",
            SIZE_CLASSES[size],
            {
              "bg-red-500 text-white animate-pulse focus:ring-red-400": isRecording,
              "bg-custom-primary-100/10 text-custom-primary-100": isProcessing,
              "bg-layer-1 text-tertiary hover:bg-layer-2 hover:text-secondary focus:ring-accent-primary":
                !isRecording && !isProcessing && !disabled,
              "opacity-50 cursor-not-allowed": isConnecting || disabled,
            },
            className
          )}
          aria-label={tooltipContent}
        >
          {isConnecting || isProcessing ? (
            <Loader2 className={cn(ICON_SIZE_CLASSES[size], "animate-spin")} />
          ) : isRecording ? (
            <MicOff className={ICON_SIZE_CLASSES[size]} />
          ) : (
            <Mic className={ICON_SIZE_CLASSES[size]} />
          )}
        </button>
      </Tooltip>
      {showRecordingIndicator && isRecording && (
        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-10">
          <RecordingIndicator
            isRecording={isRecording}
            volume={currentVolume}
            duration={recordingDuration}
          />
        </div>
      )}
      {!showRecordingIndicator && isRecording && localInterimText && (
        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 max-w-xs px-2 py-1 text-xs bg-layer-2 text-secondary rounded shadow-sm border border-subtle whitespace-nowrap overflow-hidden text-ellipsis z-10">
          {localInterimText}
        </div>
      )}
    </div>
  );
};

MicrophoneButton.displayName = "MicrophoneButton";
