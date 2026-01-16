import type { EditorView } from "@tiptap/pm/view";
import type { SideMenuHandleOptions, SideMenuPluginProps } from "@/extensions";
import { nodeDOMAtCoords } from "@/plugins/drag-handle";

const microphoneIcon =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-mic"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>';

const microphoneRecordingIcon =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-mic"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>';

export type MicrophoneHandleCallbacks = {
  onStart: (nodeInfo?: { from: number; to: number }) => void;
  onStop: () => void;
  isRecording: () => boolean;
  onStreamingText?: (text: string, nodeInfo?: { from: number; to: number }) => void;
};

export const MicrophoneHandlePlugin = (
  options: SideMenuPluginProps,
  callbacks?: MicrophoneHandleCallbacks
): SideMenuHandleOptions => {
  let micHandleElement: HTMLButtonElement | null = null;
  let iconElement: HTMLSpanElement | null = null;
  let currentNodeInfo: { from: number; to: number } | null = null;

  const updateIcon = (isRecording: boolean) => {
    if (iconElement) {
      iconElement.innerHTML = isRecording ? microphoneRecordingIcon : microphoneIcon;
    }
    if (micHandleElement) {
      if (isRecording) {
        micHandleElement.classList.add("recording");
        micHandleElement.title = "Arrêter l'enregistrement";
      } else {
        micHandleElement.classList.remove("recording");
        micHandleElement.title = "Entrée vocale (remplace la ligne)";
      }
    }
  };

  const getNodeInfoAtPosition = (view: EditorView, x: number, y: number): { from: number; to: number } | null => {
    const node = nodeDOMAtCoords({
      x: x + 50 + options.dragHandleWidth,
      y: y,
    });

    if (!(node instanceof Element)) return null;

    const pos = view.posAtDOM(node, 0);
    if (pos < 0) return null;

    const $pos = view.state.doc.resolve(pos);
    const nodeStart = $pos.start($pos.depth);
    const nodeEnd = $pos.end($pos.depth);

    return { from: nodeStart, to: nodeEnd };
  };

  const handleClick = (event: MouseEvent, view: EditorView) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (!callbacks) return;
    
    const isRecording = callbacks.isRecording();
    if (isRecording) {
      callbacks.onStop();
      updateIcon(false);
      currentNodeInfo = null;
    } else {
      const nodeInfo = getNodeInfoAtPosition(view, event.clientX, event.clientY);
      currentNodeInfo = nodeInfo;
      callbacks.onStart(nodeInfo || undefined);
      updateIcon(true);
    }
  };

  const view = (editorView: EditorView, sideMenu: HTMLDivElement | null) => {
    micHandleElement = document.createElement("button");
    micHandleElement.type = "button";
    micHandleElement.id = "mic-handle";
    micHandleElement.title = "Entrée vocale (remplace la ligne)";
    iconElement = document.createElement("span");
    iconElement.classList.value = "pointer-events-none flex items-center justify-center";
    iconElement.innerHTML = microphoneIcon;
    micHandleElement.appendChild(iconElement);
    micHandleElement.addEventListener("click", (e) => handleClick(e, editorView));
    micHandleElement.addEventListener("mousedown", (e) => e.preventDefault());

    sideMenu?.appendChild(micHandleElement);

    return {
      destroy: () => {
        micHandleElement?.remove();
        micHandleElement = null;
        iconElement = null;
        currentNodeInfo = null;
      },
    };
  };

  const domEvents = {};

  return {
    view,
    domEvents,
  };
};
