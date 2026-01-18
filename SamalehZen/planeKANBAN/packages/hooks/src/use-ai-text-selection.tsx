import { useCallback, useEffect, useState, useRef } from "react";

export type TAITextSelectionPosition = {
  x: number;
  y: number;
};

export type TAITextSelectionState = {
  selectedText: string;
  menuPosition: TAITextSelectionPosition;
  isMenuVisible: boolean;
  selectionStart: number;
  selectionEnd: number;
};

type UseAITextSelectionOptions = {
  enabled?: boolean;
  onTextSelect?: (text: string) => void;
};

export function useAITextSelection(
  inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>,
  options: UseAITextSelectionOptions = {}
) {
  const { enabled = true, onTextSelect } = options;
  const [state, setState] = useState<TAITextSelectionState>({
    selectedText: "",
    menuPosition: { x: 0, y: 0 },
    isMenuVisible: false,
    selectionStart: 0,
    selectionEnd: 0,
  });
  const menuRef = useRef<HTMLDivElement>(null);

  const calculateMenuPosition = useCallback(
    (element: HTMLInputElement | HTMLTextAreaElement): TAITextSelectionPosition => {
      const rect = element.getBoundingClientRect();
      const selectionStart = element.selectionStart ?? 0;
      const selectionEnd = element.selectionEnd ?? 0;

      if (element instanceof HTMLTextAreaElement) {
        const lineHeight = parseInt(getComputedStyle(element).lineHeight) || 20;
        const text = element.value.substring(0, selectionEnd);
        const lines = text.split("\n");
        const currentLineIndex = lines.length - 1;

        return {
          x: rect.left + Math.min(150, rect.width / 2),
          y: rect.top + (currentLineIndex + 1) * lineHeight + window.scrollY - 10,
        };
      }

      return {
        x: rect.left + rect.width / 2,
        y: rect.top + window.scrollY - 10,
      };
    },
    []
  );

  const handleSelectionChange = useCallback(() => {
    if (!enabled || !inputRef.current) return;

    const element = inputRef.current;
    const activeElement = document.activeElement;

    if (activeElement !== element) {
      setState((prev) => ({ ...prev, isMenuVisible: false }));
      return;
    }

    const selectionStart = element.selectionStart ?? 0;
    const selectionEnd = element.selectionEnd ?? 0;
    const selectedText = element.value.substring(selectionStart, selectionEnd);

    if (selectedText.trim().length > 0) {
      const position = calculateMenuPosition(element);
      setState({
        selectedText,
        menuPosition: position,
        isMenuVisible: true,
        selectionStart,
        selectionEnd,
      });
      onTextSelect?.(selectedText);
    } else {
      setState((prev) => ({ ...prev, isMenuVisible: false, selectedText: "" }));
    }
  }, [enabled, inputRef, calculateMenuPosition, onTextSelect]);

  const hideMenu = useCallback(() => {
    setState((prev) => ({ ...prev, isMenuVisible: false }));
  }, []);

  const replaceSelection = useCallback(
    (newText: string) => {
      if (!inputRef.current) return;

      const element = inputRef.current;
      const { selectionStart, selectionEnd } = state;
      const currentValue = element.value;

      const newValue =
        currentValue.substring(0, selectionStart) + newText + currentValue.substring(selectionEnd);

      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        element instanceof HTMLTextAreaElement
          ? window.HTMLTextAreaElement.prototype
          : window.HTMLInputElement.prototype,
        "value"
      )?.set;

      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(element, newValue);
        const event = new Event("input", { bubbles: true });
        element.dispatchEvent(event);
      }

      const newCursorPos = selectionStart + newText.length;
      element.setSelectionRange(newCursorPos, newCursorPos);
      element.focus();
      hideMenu();
    },
    [inputRef, state, hideMenu]
  );

  useEffect(() => {
    if (!enabled) return;

    const element = inputRef.current;
    if (!element) return;

    const handleMouseUp = () => {
      setTimeout(handleSelectionChange, 10);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown")) {
        handleSelectionChange();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        element !== target &&
        !element.contains(target)
      ) {
        hideMenu();
      }
    };

    element.addEventListener("mouseup", handleMouseUp);
    element.addEventListener("keyup", handleKeyUp);
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("selectionchange", handleSelectionChange);

    return () => {
      element.removeEventListener("mouseup", handleMouseUp);
      element.removeEventListener("keyup", handleKeyUp);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [enabled, inputRef, handleSelectionChange, hideMenu]);

  return {
    ...state,
    menuRef,
    hideMenu,
    replaceSelection,
  };
}
