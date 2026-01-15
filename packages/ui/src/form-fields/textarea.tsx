import React, { useRef, useCallback } from "react";
import { useAITextSelection } from "@plane/hooks";
import { useAutoResizeTextArea } from "../hooks/use-auto-resize-textarea";
import { cn } from "../utils";
import { FloatingAIMenu, type TAIActionPayload } from "../ai-menu/floating-ai-menu";

export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  mode?: "primary" | "transparent" | "true-transparent";
  textAreaSize?: "xs" | "sm" | "md";
  hasError?: boolean;
  className?: string;
  aiEnabled?: boolean;
  onAIAction?: (payload: TAIActionPayload) => Promise<string | null>;
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
    aiEnabled = false,
    onAIAction,
    ...rest
  } = props;
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  useAutoResizeTextArea(textAreaRef, value);

  const setRefs = useCallback(
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

  const {
    isMenuVisible,
    menuPosition,
    selectedText,
    menuRef,
    hideMenu,
    replaceSelection,
  } = useAITextSelection(textAreaRef, { enabled: aiEnabled && !!onAIAction });

  const handleAIAction = useCallback(
    async (payload: TAIActionPayload) => {
      if (!onAIAction) return null;
      return onAIAction(payload);
    },
    [onAIAction]
  );

  return (
    <>
      <textarea
        id={id}
        name={name}
        ref={setRefs}
        value={value}
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
          },
          className
        )}
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

TextArea.displayName = "TextArea";

export { TextArea };
