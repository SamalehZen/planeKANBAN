import React, { useRef, useCallback, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { useAITextSelection } from "@plane/hooks";
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
    const [isListening, setIsListening] = useState(false);

    const setRefs = useCallback(
      (node: HTMLTextAreaElement | null) => {
        textAreaRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      },
      [ref]
    );

    useAutoResizeTextArea(textAreaRef, value);

    /* ───────────────────────── 🎤 DYNAMIC NOTCH SPEECH ───────────────────────── */

    const handleVoiceTranscript = useCallback(
      (text: string) => {
        if (!textAreaRef.current || !onChange) return;

        const textarea = textAreaRef.current;
        const start = textarea.selectionStart ?? textarea.value.length;
        const end = textarea.selectionEnd ?? textarea.value.length;

        const cleanText = text.replace(/<[^>]*>/g, '').trim();
        
        const newValue =
          textarea.value.slice(0, start) +
          cleanText +
          " " +
          textarea.value.slice(end);

        const syntheticEvent = {
          target: { ...textarea, value: newValue },
          currentTarget: { ...textarea, value: newValue },
        } as React.ChangeEvent<HTMLTextAreaElement>;

        onChange(syntheticEvent);

        requestAnimationFrame(() => {
          const cursor = start + cleanText.length + 1;
          textarea.setSelectionRange(cursor, cursor);
          textarea.focus();
        });
      },
      [onChange]
    );

    const handleMicClick = useCallback(() => {
      if (isListening) return;
      
      setIsListening(true);
      
      window.dispatchEvent(new CustomEvent('dynamic-notch-trigger', {
        detail: {
          workspaceSlug,
          onTranscript: (text: string) => {
            setIsListening(false);
            handleVoiceTranscript(text);
          },
          onClose: () => {
            setIsListening(false);
          }
        }
      }));
    }, [workspaceSlug, handleVoiceTranscript, isListening]);

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

        {/* 🎤 Micro - Triggers DynamicNotch */}
        {isSpeechAvailable && (
          <Tooltip
            tooltipContent={isListening ? "En écoute..." : "Saisie vocale (Double Ctrl)"}
          >
            <button
              type="button"
              onClick={handleMicClick}
              className={cn(
                "absolute right-2 bottom-2 grid place-items-center size-6 rounded-md transition-all",
                {
                  "bg-red-500 text-white animate-pulse": isListening,
                  "bg-layer-1 text-tertiary hover:bg-layer-2 hover:text-secondary":
                    !isListening,
                }
              )}
            >
              {isListening ? (
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
