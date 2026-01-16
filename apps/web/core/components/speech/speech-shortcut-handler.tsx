"use client";

import { useEffect, useCallback } from "react";

export interface SpeechShortcutHandlerProps {
  onTrigger: () => void;
  enabled?: boolean;
}

const isTypingInInput = (target: EventTarget | null): boolean => {
  if (!target) return false;

  if (target instanceof HTMLInputElement) return true;
  if (target instanceof HTMLTextAreaElement) return true;

  const element = target as Element;
  if (element.classList?.contains("ProseMirror")) return true;
  if (element.getAttribute?.("contenteditable") === "true") return true;

  return false;
};

export const SpeechShortcutHandler = ({ onTrigger, enabled = true }: SpeechShortcutHandlerProps) => {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      if (isTypingInInput(e.target)) return;

      const isTriggerKey =
        e.key === "F2" ||
        ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "v") ||
        ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "m");

      if (isTriggerKey) {
        e.preventDefault();
        e.stopPropagation();
        onTrigger();
      }
    },
    [enabled, onTrigger]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => document.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [handleKeyDown]);

  return null;
};

export const useSpeechShortcut = (onTrigger: () => void, enabled = true) => {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      if (isTypingInInput(e.target)) return;

      const isTriggerKey =
        e.key === "F2" ||
        ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "v") ||
        ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "m");

      if (isTriggerKey) {
        e.preventDefault();
        e.stopPropagation();
        onTrigger();
      }
    },
    [enabled, onTrigger]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => document.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [handleKeyDown]);
};
