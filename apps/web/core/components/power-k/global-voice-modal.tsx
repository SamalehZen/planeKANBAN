import { GlobalDynamicNotch } from '@plane/ui';
import { useParams } from 'next/navigation';

export const GlobalVoiceModal: React.FC = () => {
  const params = useParams();
  const workspaceSlug = params?.workspaceSlug as string | undefined;

  const handleTranscript = (text: string, isProcessed: boolean) => {
    console.log('[GlobalVoice] Transcript received:', text.substring(0, 50), 'processed:', isProcessed);
    
    const activeElement = document.activeElement;
    
    if (activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement) {
      const start = activeElement.selectionStart ?? activeElement.value.length;
      const end = activeElement.selectionEnd ?? activeElement.value.length;
      const currentValue = activeElement.value;
      const cleanText = text.replace(/<[^>]*>/g, '').trim();
      const newValue = currentValue.slice(0, start) + cleanText + currentValue.slice(end);
      activeElement.value = newValue;
      activeElement.setSelectionRange(start + cleanText.length, start + cleanText.length);
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
        
        if (isProcessed && text.includes('<')) {
          const temp = document.createElement('div');
          temp.innerHTML = text;
          const fragment = document.createDocumentFragment();
          while (temp.firstChild) {
            fragment.appendChild(temp.firstChild);
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

    navigator.clipboard.writeText(text.replace(/<[^>]*>/g, '')).then(() => {
      console.log("[GlobalVoice] Text copied to clipboard");
    });
  };

  return (
    <GlobalDynamicNotch
      workspaceSlug={workspaceSlug}
      language="fr-FR"
      theme="auto"
      showFloatingButton={true}
    />
  );
};
