import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
// constants
import { CORE_EXTENSIONS } from "@/constants/extension";
// plugins
import { AIHandlePlugin } from "@/plugins/ai-handle";
import { DragHandlePlugin, nodeDOMAtCoords } from "@/plugins/drag-handle";
import type { MicrophoneHandleCallbacks } from "@/plugins/microphone-handle";
import { MicrophoneHandlePlugin } from "@/plugins/microphone-handle";

type Props = {
  aiEnabled: boolean;
  dragDropEnabled: boolean;
  speechEnabled?: boolean;
  speechCallbacks?: MicrophoneHandleCallbacks;
};

export type SideMenuPluginProps = {
  dragHandleWidth: number;
  handlesConfig: {
    ai: boolean;
    dragDrop: boolean;
    speech: boolean;
  };
  speechCallbacks?: MicrophoneHandleCallbacks;
  scrollThreshold: {
    up: number;
    down: number;
  };
};

export type SideMenuHandleOptions = {
  view: (view: EditorView, sideMenu: HTMLDivElement | null) => void;
  domEvents?: {
    [key: string]: (...args: any) => void;
  };
};

export const SideMenuExtension = (props: Props) => {
  const { aiEnabled, dragDropEnabled, speechEnabled = false, speechCallbacks } = props;

  return Extension.create({
    name: CORE_EXTENSIONS.SIDE_MENU,
    addProseMirrorPlugins() {
      return [
        SideMenu({
          dragHandleWidth: 24,
          handlesConfig: {
            ai: aiEnabled,
            dragDrop: dragDropEnabled,
            speech: speechEnabled,
          },
          speechCallbacks,
          scrollThreshold: { up: 200, down: 150 },
        }),
      ];
    },
  });
};

const absoluteRect = (node: Element) => {
  const data = node.getBoundingClientRect();

  return {
    top: data.top,
    left: data.left,
    width: data.width,
  };
};

const SideMenu = (options: SideMenuPluginProps) => {
  const { handlesConfig, speechCallbacks } = options;
  const editorSideMenu: HTMLDivElement | null = document.createElement("div");
  editorSideMenu.id = "editor-side-menu";
  let hideTimeout: ReturnType<typeof setTimeout> | null = null;
  let isHoveringMenu = false;

  editorSideMenu.addEventListener("mouseenter", () => {
    isHoveringMenu = true;
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
    editorSideMenu.classList.add("side-menu-visible");
    editorSideMenu.classList.remove("side-menu-hidden");
  });

  editorSideMenu.addEventListener("mouseleave", () => {
    isHoveringMenu = false;
    hideTimeout = setTimeout(() => {
      if (!isHoveringMenu) {
        hideSideMenu();
      }
    }, 300);
  });

  // side menu view actions
  const hideSideMenu = () => {
    if (isHoveringMenu) return;
    editorSideMenu?.classList.remove("side-menu-visible");
    if (!editorSideMenu?.classList.contains("side-menu-hidden")) editorSideMenu?.classList.add("side-menu-hidden");
  };
  const showSideMenu = () => {
    if (hideTimeout) {
      clearTimeout(hideTimeout);
      hideTimeout = null;
    }
    editorSideMenu?.classList.remove("side-menu-hidden");
  };
  // side menu elements
  const { view: dragHandleView, domEvents: dragHandleDOMEvents } = DragHandlePlugin(options);
  const { view: aiHandleView, domEvents: aiHandleDOMEvents } = AIHandlePlugin(options);
  const { view: micHandleView, domEvents: micHandleDOMEvents } = MicrophoneHandlePlugin(options, speechCallbacks);

  return new Plugin({
    key: new PluginKey("sideMenu"),
    view: (view) => {
      hideSideMenu();
      view?.dom.parentElement?.appendChild(editorSideMenu);
      // side menu elements' initialization
      if (handlesConfig.ai && !editorSideMenu.querySelector("#ai-handle")) {
        aiHandleView(view, editorSideMenu);
      }

      if (handlesConfig.speech && speechCallbacks && !editorSideMenu.querySelector("#mic-handle")) {
        micHandleView(view, editorSideMenu);
      }

      if (handlesConfig.dragDrop && !editorSideMenu.querySelector("#drag-handle")) {
        dragHandleView(view, editorSideMenu);
      }

      return {
        destroy: () => hideSideMenu(),
      };
    },
    props: {
      handleDOMEvents: {
        mousemove: (view, event) => {
          if (!view.editable) return;

          const node = nodeDOMAtCoords({
            x: event.clientX + 50 + options.dragHandleWidth,
            y: event.clientY,
          });

          if (!(node instanceof Element) || node.matches("ul, ol")) {
            hideSideMenu();
            return;
          }

          const compStyle = window.getComputedStyle(node);
          const lineHeight = parseInt(compStyle.lineHeight, 10);
          const paddingTop = parseInt(compStyle.paddingTop, 10);

          const rect = absoluteRect(node);

          rect.top += (lineHeight - 20) / 2;
          rect.top += paddingTop;

          let leftOffset = 0;
          if (handlesConfig.ai) {
            leftOffset += 20;
          }
          if (handlesConfig.speech && speechCallbacks) {
            leftOffset += 20;
          }
          rect.left -= leftOffset;

          if (node.parentElement?.parentElement?.matches("td") || node.parentElement?.parentElement?.matches("th")) {
            if (node.matches("ul:not([data-type=taskList]) li, ol li")) {
              rect.left -= 5;
            }
          } else {
            // Li markers
            if (node.matches("ul:not([data-type=taskList]) li, ol li")) {
              rect.left -= 18;
            }
          }

          if (node.matches("table")) {
            rect.top += 8;
            rect.left -= 8;
          }

          rect.width = options.dragHandleWidth;

          if (!editorSideMenu) return;

          editorSideMenu.style.left = `${rect.left - rect.width}px`;
          editorSideMenu.style.top = `${rect.top}px`;
          showSideMenu();
          if (handlesConfig.dragDrop) {
            dragHandleDOMEvents?.mousemove();
          }
          if (handlesConfig.ai) {
            aiHandleDOMEvents?.mousemove?.();
          }
          if (handlesConfig.speech) {
            micHandleDOMEvents?.mousemove?.();
          }
        },
        // keydown: () => hideSideMenu(),
        mousewheel: () => {
          if (!isHoveringMenu) {
            hideTimeout = setTimeout(() => hideSideMenu(), 200);
          }
        },
        dragenter: (view) => {
          if (handlesConfig.dragDrop) {
            dragHandleDOMEvents?.dragenter?.(view);
          }
        },
        drop: (view, event) => {
          if (handlesConfig.dragDrop) {
            dragHandleDOMEvents?.drop?.(view, event);
          }
        },
        dragend: (view) => {
          if (handlesConfig.dragDrop) {
            dragHandleDOMEvents?.dragend?.(view);
          }
        },
      },
    },
  });
};
