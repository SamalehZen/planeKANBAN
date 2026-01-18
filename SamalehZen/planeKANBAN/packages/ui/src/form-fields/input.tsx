import * as React from "react";
import { useRef, useCallback } from "react";
import { Loader2, Mic, MicOff } from "lucide-react";
import { useSpeechToText, useAITextSelection } from "@plane/hooks";
import { Tooltip } from "../tooltip";
import { cn } from "../utils";
import { FloatingAIMenu, type TAIActionPayload } from "../ai-menu/floating-ai-menu";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  mode?: "primary" | "transparent" | "true-transparent";
  inputSize?: "xs" | "sm" | "md";
  hasError?: boolean;
  className?: string;
  autoComplete?: "on" | "off";

  /** Speech */
  speechEnabled?: boolean;
  workspaceSlug?: string;

  /** AI */
  aiEnabled?: boolean;
  onAIAction?: (payload: TAIActionPayload) => Promise<string | null>;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  props,
  ref
) {
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

    aiEnabled = false,
    onAIAction,

    ...rest
  } = props;

  const inputRef = useRef<HTMLInputElement | null>(null);

  /** 🔗 Ref unifiée (robuste & standard) */
  const setRefs = useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref]
  );

  /* ───────────────────────── 🎤 SPEECH TO TEXT ───────────────────────── */

  const handleSpeechTranscript = useCallback(
    (text: string, isFinal: boolean) => {
      if (!isFinal || !inputRef.current || !onChange) return;

      const input = inputRef.current;
      const start = input.selectionStart ?? 0;
      const end = input.selectionEnd ?? 0;

      const newValue =
        input.value.slice(0, start) +
        text +
        " " +
        input.value.slice(end);

      const syntheticEvent = {
        target: { ...input, value: newValue },
        currentTarget: { ...input, value: newValue },
      } as React.ChangeEvent<HTMLInputElement>;

      onChange(syntheticEvent);

      /** 🎯 Cursor précis (meilleur que setTimeout) */
      requestAnimationFrame(() => {
        const cursor = start + text.length + 1;
        input.setSelectionRange(cursor, cursor);
        input.focus();
      });
    },
    [onChange]
  );

  const { isRecording, isConnecting, startRecording, stopRecording } =
    useSpeechToText({
      workspaceSlug: workspaceSlug || "",
      onTranscript: handleSpeechTranscript,
    });

  const handleMicClick = useCallback(() => {
    isRecording ? stopRecording() : startRecording();
  }, [isRecording, startRecording, stopRecording]);

  const isSpeechAvailable = speechEnabled && !!workspaceSlug;

  /* ───────────────────────── 🤖 AI TEXT SELECTION ───────────────────────── */

  const {
    isMenuVisible,
    menuPosition,
    selectedText,
    menuRef,
    hideMenu,
    replaceSelection,
  } = useAITextSelection(inputRef, {
    enabled: aiEnabled && !!onAIAction,
  });

  const handleAIAction = useCallback(
    async (payload: TAIActionPayload) => {
      if (!onAIAction) return null;
      return onAIAction(payload);
    },
    [onAIAction]
  );

  /* ───────────────────────────── RENDER ───────────────────────────── */

  return (
    <div className="relative inline-flex w-full">
      <input
        id={id}
        ref={setRefs}
        type={type}
        name={name}
        onChange={onChange}
        autoComplete={autoComplete}
        className={cn(
          "block w-full rounded-md bg-layer-2 text-13 placeholder-tertiary border-subtle-1 focus:outline-none",
          {
            "rounded-md border-[0.5px]": mode === "primary",
            "rounded-sm border-none bg-transparent ring-0 transition-all focus:ring-1 focus:ring-accent-strong":
              mode === "transparent",
            "rounded-sm border-none bg-transparent ring-0":
              mode === "true-transparent",
            "border-red-500": hasError,
            "px-1.5 py-1": inputSize === "xs",
            "px-3 py-2": inputSize === "sm",
            "p-3": inputSize === "md",
            "pr-10": isSpeechAvailable,
          },
          className
        )}
        {...rest}
      />

      {/* 🎤 Micro */}
      {isSpeechAvailable && (
        <Tooltip
          tooltipContent={
            isConnecting
              ? "Connecting..."
              : isRecording
              ? "Stop recording"
              : "Voice input"
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
                "bg-layer-1 text-tertiary hover:bg-layer-2 hover:text-secondary":
                  !isRecording,
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

      {/* 🤖 Menu IA (même stacking context → moins de bugs UI) */}
      {aiEnabled && onAIAction && (
        <FloatingAIMenu
          isVisible={isMenuVisible}
          position={menuPosition}
          selectedText={selectedText}
          onClose={hideMenu}
          onAction={handleAIAction}
          onReplace={replaceSelection}
          menuRef={menuRef}
        />
      )}
    </div>
  );
});

Input.displayName = "form-input-field";
export { Input };
