import { useCallback, useEffect, useRef } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import { VoiceAssistantModal } from "@plane/ui";
import { usePowerK } from "@/hooks/store/use-power-k";

const LONG_PRESS_DURATION = 3000;

export const GlobalVoiceModal = observer(function GlobalVoiceModal() {
  const params = useParams();
  const workspaceSlug = params?.workspaceSlug?.toString() ?? "";
  const { isVoiceModalOpen, toggleVoiceModal } = usePowerK();
  
  const ctrlPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isCtrlPressedRef = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Control" && !isCtrlPressedRef.current && !isVoiceModalOpen) {
        isCtrlPressedRef.current = true;
        
        ctrlPressTimerRef.current = setTimeout(() => {
          if (isCtrlPressedRef.current) {
            console.log("[Voice] Ctrl held for 3s - opening voice modal");
            toggleVoiceModal(true);
          }
        }, LONG_PRESS_DURATION);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Control") {
        isCtrlPressedRef.current = false;
        if (ctrlPressTimerRef.current) {
          clearTimeout(ctrlPressTimerRef.current);
          ctrlPressTimerRef.current = null;
        }
      }
    };

    const handleBlur = () => {
      isCtrlPressedRef.current = false;
      if (ctrlPressTimerRef.current) {
        clearTimeout(ctrlPressTimerRef.current);
        ctrlPressTimerRef.current = null;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
      if (ctrlPressTimerRef.current) {
        clearTimeout(ctrlPressTimerRef.current);
      }
    };
  }, [isVoiceModalOpen, toggleVoiceModal]);

  const handleResult = useCallback((text: string) => {
    const activeElement = document.activeElement;
    
    if (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement) {
      const start = activeElement.selectionStart ?? activeElement.value.length;
      const end = activeElement.selectionEnd ?? activeElement.value.length;
      const currentValue = activeElement.value;
      const newValue = currentValue.slice(0, start) + text + currentValue.slice(end);
      activeElement.value = newValue;
      activeElement.setSelectionRange(start + text.length, start + text.length);
      activeElement.dispatchEvent(new Event("input", { bubbles: true }));
      activeElement.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }

    const proseMirror = document.querySelector(".ProseMirror") as HTMLElement;
    if (proseMirror && proseMirror.isContentEditable) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const textNode = document.createTextNode(text);
        range.insertNode(textNode);
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(range);
        proseMirror.dispatchEvent(new Event("input", { bubbles: true }));
      }
      return;
    }

    navigator.clipboard.writeText(text).then(() => {
      console.log("[GlobalVoice] Text copied to clipboard:", text.substring(0, 50));
    });
  }, []);

  const handleClose = useCallback(() => {
    toggleVoiceModal(false);
  }, [toggleVoiceModal]);

  if (!workspaceSlug) return null;

  return (
    <VoiceAssistantModal
      isOpen={isVoiceModalOpen}
      onClose={handleClose}
      onResult={handleResult}
      language="fr-FR"
      workspaceSlug={workspaceSlug}
    />
  );
});
