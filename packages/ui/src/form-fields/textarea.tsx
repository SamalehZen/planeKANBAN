import React, { useRef, useCallback } from "react";
import { Loader2, Mic, MicOff } from "lucide-react";
import { useSpeechToText, useAITextSelection } from "@plane/hooks";
import { useAutoResizeTextArea } from "../hooks/use-auto-resize-textarea";
import { Tooltip } from "../tooltip";
import { cn } from "../utils";
import { FloatingAIMenu, type TAIActionPayload } from "../ai-menu/floating-ai-menu";

export interface TextAreaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  mode?: "primary" | "transparent" | "true-transparent";
  textAreaSize?: "xs" | "sm" | "md";
  hasError?: boolean;
  className?: string;

  /** Speech */
  speechEnabled?: boolean;
  workspaceSlug?: string;

  /** AI */
  aiEnabled?: boolean;
  onAIAction?: (payload: TAIActionPayload) => Promise<string | null>;
}

const TextArea = React.forwardRef<HTMLTextAreaElement, TextAreaProps>(
  function TextArea(props, ref) {
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

      aiEnabled = false,
      onAIAction,

      ...rest
    } = props;

    const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

    /** 🔗 Ref unifiée */
    const setRefs = useCallback(
      (node: HTMLTextAreaElement | null) => {
        textAreaRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      },
      [ref]
    );

    useAutoResizeTextArea(textAreaRef, value);

    /* ───────────────────────── 🎤 SPEECH TO TEXT ───────────────────────── */

    const handleSpeechTranscript = useCallback(
      (text: string, isFinal: boolean) => {
        if (!isFinal || !textAreaRef.current || !onChange) return;

        const textarea = textAreaRef.current;
        const start = textarea.selectionStart ?? 0;
        const end = textarea.selectionEnd ?? 0;

        const newValue =
          textarea.value.slice(0, start) +
          text +
          " " +
          textarea.value.slice(end);

        const syntheticEvent = {
          target: { ...textarea, value: newValue },
          currentTarget: { ...textarea, value: newValue },
        } as React.ChangeEvent<HTMLTextAreaElement>;

        onChange(syntheticEvent);

        requestAnimationFrame(() => {
          const cursor = start + text.length + 1;
          textarea.setSelectionRange(cursor, cursor);
          textarea.focus();
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
    } = useAITextSelection(textAreaRef, {
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
      <div className="relative w-full">
        <textarea
          id={id}
          name={name}
          ref={setRefs}
          value={value}
          onChange={onChange}
          className={cn(
            "no-scrollbar w-full bg-layer-2 placeholder-(--text-color-placeholder) outline-none",
            {
              "rounded-md border-[0.5px] border-subtle-1": mode === "primary",
              "focus:ring-theme rounded-sm border-none bg-transparent ring-0 transition-all focus:ring-1":
                mode === "transparent",
              "rounded-sm border-none bg-transparent ring-0":
                mode === "true-transparent",
              "px-1.5 py-1": textAreaSize === "xs",
              "px-3 py-2": textAreaSize === "sm",
              "p-3": textAreaSize === "md",
              "border-red-500 bg-red-100":
                hasError && mode === "primary",
              "border-red-500": hasError && mode !== "primary",
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
                "absolute right-2 bottom-2 grid place-items-center size-6 rounded-md transition-all",
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

        {/* 🤖 Menu IA */}
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
  }
);

TextArea.displayName = "TextArea";
export { TextArea };
