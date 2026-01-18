import { Mic } from "lucide-react";
import * as React from "react";
import { useState, useCallback, useRef } from "react";
import { cn } from "../utils";
import { Tooltip } from "../tooltip";
import { VoiceAssistantModal } from "./voice-assistant-modal";

type TButtonSize = "sm" | "md" | "lg";

export interface MicrophoneButtonProps {
  workspaceSlug?: string;
  onTranscript: (text: string) => void;
  onError?: (error: Error) => void;
  className?: string;
  size?: TButtonSize;
  disabled?: boolean;
  tooltipPosition?: "top" | "bottom" | "left" | "right";
  geminiApiKey?: string;
  language?: string;
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
  onTranscript,
  className,
  size = "md",
  disabled = false,
  tooltipPosition = "top",
  geminiApiKey,
  language = "fr-FR",
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  const handleClick = useCallback(() => {
    if (buttonRef.current) {
      setAnchorRect(buttonRef.current.getBoundingClientRect());
    }
    setIsModalOpen(true);
  }, []);

  const handleResult = useCallback(
    (text: string) => {
      onTranscript(text);
    },
    [onTranscript]
  );

  const handleClose = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  return (
    <>
      <Tooltip tooltipContent="Saisie vocale" position={tooltipPosition}>
        <button
          ref={buttonRef}
          type="button"
          onClick={handleClick}
          disabled={disabled}
          className={cn(
            "grid place-items-center rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1",
            SIZE_CLASSES[size],
            {
              "bg-layer-1 text-tertiary hover:bg-layer-2 hover:text-secondary focus:ring-accent-primary": !disabled,
              "opacity-50 cursor-not-allowed": disabled,
            },
            className
          )}
          aria-label="Saisie vocale"
        >
          <Mic className={ICON_SIZE_CLASSES[size]} />
        </button>
      </Tooltip>

      <VoiceAssistantModal
        isOpen={isModalOpen}
        onClose={handleClose}
        onResult={handleResult}
        geminiApiKey={geminiApiKey}
        language={language}
        anchorRect={anchorRect}
      />
    </>
  );
};

MicrophoneButton.displayName = "MicrophoneButton";
