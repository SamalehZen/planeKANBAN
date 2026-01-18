import { DynamicNotchController } from '@plane/ui';

export const GlobalVoiceModal: React.FC = () => {
  const handleVoiceStart = () => {
    console.log('Voice recording started');
  };

  const handleVoiceEnd = (audioBlob: Blob) => {
    console.log('Voice recording ended, blob size:', audioBlob.size);
  };

  const handleAIResponse = (text: string) => {
    console.log('AI response:', text);
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
  };

  return (
    <DynamicNotchController
      onVoiceStart={handleVoiceStart}
      onVoiceEnd={handleVoiceEnd}
      onAIResponse={handleAIResponse}
      theme="dark"
    />
  );
};
