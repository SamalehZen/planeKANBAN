import { useCallback, useEffect, useRef } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import { VoiceAssistantModal } from "@plane/ui";
import { usePowerK } from "@/hooks/store/use-power-k";

const DOUBLE_TAP_DELAY = 400;

export const GlobalVoiceModal = observer(function GlobalVoiceModal() {
  const params = useParams();
  const workspaceSlug = params?.workspaceSlug?.toString() ?? "";
  const { isVoiceModalOpen, toggleVoiceModal } = usePowerK();
  
  const lastCtrlPressRef = useRef<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Control" && !e.repeat && !isVoiceModalOpen) {
        const now = Date.now();
        const timeSinceLastPress = now - lastCtrlPressRef.current;
        
        if (timeSinceLastPress < DOUBLE_TAP_DELAY) {
          console.log("[Voice] Double-tap Ctrl detected - opening voice modal");
          toggleVoiceModal(true);
          lastCtrlPressRef.current = 0;
        } else {
          lastCtrlPressRef.current = now;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
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
