import * as React from "react";
import { useRef, useCallback } from "react";
import type { AI_EDITOR_TASKS } from "@plane/constants";
import { useAITextSelection } from "@plane/hooks";
import { cn } from "../utils";
import { FloatingAIMenu } from "../ai-menu/floating-ai-menu";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  mode?: "primary" | "transparent" | "true-transparent";
  inputSize?: "xs" | "sm" | "md";
  hasError?: boolean;
  className?: string;
  autoComplete?: "on" | "off";
  aiEnabled?: boolean;
  onAIAction?: (task: AI_EDITOR_TASKS, text: string) => Promise<string | null>;
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
    aiEnabled = false,
    onAIAction,
    ...rest
  } = props;

  const inputRef = useRef<HTMLInputElement | null>(null);

  const setRefs = useCallback(
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

  const {
    isMenuVisible,
    menuPosition,
    selectedText,
    menuRef,
    hideMenu,
    replaceSelection,
  } = useAITextSelection(inputRef, { enabled: aiEnabled && !!onAIAction });

  const handleAIAction = useCallback(
    async (task: AI_EDITOR_TASKS, text: string) => {
      if (!onAIAction) return null;
      return onAIAction(task, text);
    },
    [onAIAction]
  );

  return (
    <>
      <input
        id={id}
        ref={setRefs}
        type={type}
        name={name}
        className={cn(
          "block rounded-md bg-layer-2 text-13 placeholder-tertiary border-subtle-1 focus:outline-none",
          {
            "rounded-md border-[0.5px]": mode === "primary",
            "rounded-sm border-none bg-transparent ring-0 transition-all focus:ring-1 focus:ring-accent-strong":
              mode === "transparent",
            "rounded-sm border-none bg-transparent ring-0": mode === "true-transparent",
            "border-red-500": hasError,
            "px-1.5 py-1": inputSize === "xs",
            "px-3 py-2": inputSize === "sm",
            "p-3": inputSize === "md",
          },
          className
        )}
        autoComplete={autoComplete}
        {...rest}
      />
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
    </>
  );
});

Input.displayName = "form-input-field";

export { Input };
