import * as React from "react";
import { useRef, useCallback } from "react";
import { Loader2, Mic, MicOff } from "lucide-react";
import { useSpeechToText } from "@plane/hooks";
import { Tooltip } from "../tooltip";
import { cn } from "../utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  mode?: "primary" | "transparent" | "true-transparent";
  inputSize?: "xs" | "sm" | "md";
  hasError?: boolean;
  className?: string;
  autoComplete?: "on" | "off";
  speechEnabled?: boolean;
  workspaceSlug?: string;
}

const Input = React.forwardRef(function Input(props: InputProps, ref: React.ForwardedRef<HTMLInputElement>) {
  const {
    id,
    type,
    name,
    mode = "primary",
    inputSize = "sm",
    hasError = false,
    className = "",
    autoComplete = "off",
    speechEnabled = false,
    workspaceSlug,
    onChange,
    ...rest
  } = props;

  const inputRef = useRef<HTMLInputElement | null>(null);
  const combinedRef = useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node;
      if (typeof ref === "function") {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    },
    [ref]
  );

  const handleSpeechTranscript = useCallback(
    (text: string, isFinal: boolean) => {
      if (isFinal && inputRef.current && onChange) {
        const input = inputRef.current;
        const start = input.selectionStart || 0;
        const end = input.selectionEnd || 0;
        const currentValue = input.value;
        const newValue = currentValue.substring(0, start) + text + " " + currentValue.substring(end);

        const syntheticEvent = {
          target: { ...input, value: newValue },
          currentTarget: { ...input, value: newValue },
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(syntheticEvent);

        setTimeout(() => {
          const newCursorPos = start + text.length + 1;
          input.setSelectionRange(newCursorPos, newCursorPos);
          input.focus();
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
    <div className="relative inline-flex w-full">
      <input
        id={id}
        ref={combinedRef}
        type={type}
        name={name}
        onChange={onChange}
        className={cn(
          "block w-full rounded-md bg-layer-2 text-13 placeholder-tertiary border-subtle-1 focus:outline-none",
          {
            "rounded-md border-[0.5px]": mode === "primary",
            "rounded-sm border-none bg-transparent ring-0 transition-all focus:ring-1 focus:ring-accent-strong":
              mode === "transparent",
            "rounded-sm border-none bg-transparent ring-0": mode === "true-transparent",
            "border-red-500": hasError,
            "px-1.5 py-1": inputSize === "xs",
            "px-3 py-2": inputSize === "sm",
            "p-3": inputSize === "md",
            "pr-10": isSpeechAvailable,
          },
          className
        )}
        autoComplete={autoComplete}
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
              "absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center size-6 rounded-md transition-all",
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

Input.displayName = "form-input-field";

export { Input };
