import { useCallback } from "react";
import { createPortal } from "react-dom";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import { DynamicNotchController } from "@plane/ui";

export const GlobalVoiceModal = observer(function GlobalVoiceModal() {
  const params = useParams();
  const workspaceSlug = params?.workspaceSlug?.toString() ?? "";

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
        
        const isHtml = text.includes('<') && text.includes('>');
        if (isHtml) {
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = text;
          const fragment = document.createDocumentFragment();
          while (tempDiv.firstChild) {
            fragment.appendChild(tempDiv.firstChild);
          }
          range.insertNode(fragment);
        } else {
          const textNode = document.createTextNode(text);
          range.insertNode(textNode);
          range.setStartAfter(textNode);
          range.setEndAfter(textNode);
        }
        
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

  if (!workspaceSlug) return null;

  const notchContent = (
    <DynamicNotchController
      onResult={handleResult}
      language="fr-FR"
      workspaceSlug={workspaceSlug}
      enabled={true}
    />
  );

  return createPortal(notchContent, document.body);
});
