import * as React from "react";
import { useRef, useCallback, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { useAITextSelection } from "@plane/hooks";
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
  const [isListening, setIsListening] = useState(false);

  const setRefs = useCallback(
    (node: HTMLInputElement | null) => {
      inputRef.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    },
    [ref]
  );

  /* ───────────────────────── 🎤 DYNAMIC NOTCH SPEECH ───────────────────────── */

  const handleVoiceTranscript = useCallback(
    (text: string) => {
      if (!inputRef.current || !onChange) return;

      const input = inputRef.current;
      const start = input.selectionStart ?? input.value.length;
      const end = input.selectionEnd ?? input.value.length;

      const cleanText = text.replace(/<[^>]*>/g, '').trim();
      
      const newValue =
        input.value.slice(0, start) +
        cleanText +
        " " +
        input.value.slice(end);

      const syntheticEvent = {
        target: { ...input, value: newValue },
        currentTarget: { ...input, value: newValue },
      } as React.ChangeEvent<HTMLInputElement>;

      onChange(syntheticEvent);

      requestAnimationFrame(() => {
        const cursor = start + cleanText.length + 1;
        input.setSelectionRange(cursor, cursor);
        input.focus();
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

      {/* 🎤 Micro - Triggers DynamicNotch */}
      {isSpeechAvailable && (
        <Tooltip
          tooltipContent={isListening ? "En écoute..." : "Saisie vocale (Double Ctrl)"}
        >
          <button
            type="button"
            onClick={handleMicClick}
            className={cn(
              "absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center size-6 rounded-md transition-all",
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
});

Input.displayName = "form-input-field";
export { Input };
