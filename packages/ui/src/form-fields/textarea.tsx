import React, { useRef, useCallback } from "react";
import { Loader2, Mic, MicOff } from "lucide-react";
import { useSpeechToText } from "@plane/hooks";
import { useAutoResizeTextArea } from "../hooks/use-auto-resize-textarea";
import { Tooltip } from "../tooltip";
import { cn } from "../utils";

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  mode?: "primary" | "transparent" | "true-transparent";
  textAreaSize?: "xs" | "sm" | "md";
  hasError?: boolean;
  className?: string;
  speechEnabled?: boolean;
  workspaceSlug?: string;
}

const TextArea = React.forwardRef(function TextArea(
  props: TextAreaProps,
  ref: React.ForwardedRef<HTMLTextAreaElement>
) {
  const {
    id,
    name,
    value = "",
    mode = "primary",
    textAreaSize = "sm",
    hasError = false,
    className = "",
    speechEnabled = false,
    workspaceSlug,
    onChange,
    ...rest
  } = props;
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const combinedRef = useCallback(
    (node: HTMLTextAreaElement | null) => {
      textAreaRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    },
    [ref]
  );
  useAutoResizeTextArea(textAreaRef, value);

  const handleSpeechTranscript = useCallback(
    (text: string, isFinal: boolean) => {
      if (isFinal && textAreaRef.current && onChange) {
        const textarea = textAreaRef.current;
        const start = textarea.selectionStart || 0;
        const end = textarea.selectionEnd || 0;
        const currentValue = textarea.value;
        const newValue = currentValue.substring(0, start) + text + " " + currentValue.substring(end);

        const syntheticEvent = {
          target: { ...textarea, value: newValue },
          currentTarget: { ...textarea, value: newValue },
        } as React.ChangeEvent<HTMLTextAreaElement>;
        onChange(syntheticEvent);

        setTimeout(() => {
          const newCursorPos = start + text.length + 1;
          textarea.setSelectionRange(newCursorPos, newCursorPos);
          textarea.focus();
        }, 0);
      }
    },
    [onChange]
  );

  const { isRecording, isConnecting, startRecording, stopRecording } = useSpeechToText({
    workspaceSlug: workspaceSlug || "",
    onTranscript: handleSpeechTranscript,
  });

  const handleMicClick = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const isSpeechAvailable = speechEnabled && workspaceSlug;

  return (
    <div className="relative">
      <textarea
        id={id}
        name={name}
        ref={combinedRef}
        value={value}
        onChange={onChange}
        className={cn(
          "no-scrollbar w-full bg-layer-2 placeholder-(--text-color-placeholder) outline-none",
          {
            "rounded-md border-[0.5px] border-subtle-1": mode === "primary",
            "focus:ring-theme rounded-sm border-none bg-transparent ring-0 transition-all focus:ring-1":
              mode === "transparent",
            "rounded-sm border-none bg-transparent ring-0": mode === "true-transparent",
            "px-1.5 py-1": textAreaSize === "xs",
            "px-3 py-2": textAreaSize === "sm",
            "p-3": textAreaSize === "md",
            "border-red-500": hasError,
            "bg-red-100": hasError && mode === "primary",
            "pr-10": isSpeechAvailable,
          },
          className
        )}
        {...rest}
      />
      {isSpeechAvailable && (
        <Tooltip
          tooltipContent={
            isConnecting ? "Connecting..." : isRecording ? "Stop recording" : "Voice input"
          }
        >
          <button
            type="button"
            onClick={handleMicClick}
            disabled={isConnecting}
            className={cn(
              "absolute right-2 bottom-2 grid place-items-center size-6 rounded-md transition-all",
              {
                "bg-red-500 text-white animate-pulse": isRecording,
                "bg-layer-1 text-tertiary hover:bg-layer-2 hover:text-secondary": !isRecording,
                "opacity-50 cursor-not-allowed": isConnecting,
              }
            )}
          >
            {isConnecting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : isRecording ? (
              <MicOff className="size-3.5" />
            ) : (
              <Mic className="size-3.5" />
            )}
          </button>
        </Tooltip>
      )}
    </div>
  );
});

TextArea.displayName = "TextArea";

export { TextArea };
