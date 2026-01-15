import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Sparkles,
  FileText,
  Expand,
  Minimize2,
  Heading,
  Loader2,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AI_EDITOR_TASKS, AI_TASK_LABELS, AI_TASK_LOADING_TEXTS } from "@plane/constants";
import { cn } from "../utils";

type AIMenuItem = {
  key: AI_EDITOR_TASKS;
  label: string;
  icon: LucideIcon;
};

const AI_MENU_ITEMS: AIMenuItem[] = [
  {
    key: AI_EDITOR_TASKS.PARAPHRASE,
    label: AI_TASK_LABELS[AI_EDITOR_TASKS.PARAPHRASE],
    icon: Sparkles,
  },
  {
    key: AI_EDITOR_TASKS.SIMPLIFY,
    label: AI_TASK_LABELS[AI_EDITOR_TASKS.SIMPLIFY],
    icon: FileText,
  },
  {
    key: AI_EDITOR_TASKS.EXPAND,
    label: AI_TASK_LABELS[AI_EDITOR_TASKS.EXPAND],
    icon: Expand,
  },
  {
    key: AI_EDITOR_TASKS.SUMMARIZE,
    label: AI_TASK_LABELS[AI_EDITOR_TASKS.SUMMARIZE],
    icon: Minimize2,
  },
  {
    key: AI_EDITOR_TASKS.GENERATE_TITLE,
    label: AI_TASK_LABELS[AI_EDITOR_TASKS.GENERATE_TITLE],
    icon: Heading,
  },
];

export type TFloatingAIMenuProps = {
  isVisible: boolean;
  position: { x: number; y: number };
  selectedText: string;
  onClose: () => void;
  onAction: (task: AI_EDITOR_TASKS, text: string) => Promise<string | null>;
  onReplace: (newText: string) => void;
  menuRef?: React.RefObject<HTMLDivElement>;
};

export function FloatingAIMenu(props: TFloatingAIMenuProps) {
  const { isVisible, position, selectedText, onClose, onAction, onReplace, menuRef } = props;
  const [isLoading, setIsLoading] = useState(false);
  const [activeTask, setActiveTask] = useState<AI_EDITOR_TASKS | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const handleAction = useCallback(
    async (task: AI_EDITOR_TASKS) => {
      if (!selectedText.trim() || isLoading) return;

      setIsLoading(true);
      setActiveTask(task);

      try {
        const response = await onAction(task, selectedText);
        if (response) {
          onReplace(response);
        }
      } finally {
        setIsLoading(false);
        setActiveTask(null);
        onClose();
      }
    },
    [selectedText, isLoading, onAction, onReplace, onClose]
  );

  useEffect(() => {
    if (!isVisible) {
      setIsLoading(false);
      setActiveTask(null);
    }
  }, [isVisible]);

  if (!mounted || !isVisible) return null;

  const menuContent = (
    <div
      ref={menuRef}
      className="fixed z-50 animate-in fade-in-0 zoom-in-95 duration-200"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: "translate(-50%, -100%)",
      }}
    >
      <div className="flex flex-col rounded-lg border border-subtle-1 bg-surface-1 shadow-raised-200 overflow-hidden min-w-[200px]">
        <div className="flex items-center justify-between px-3 py-2 border-b border-subtle-1 bg-layer-1">
          <div className="flex items-center gap-2 text-13 font-medium text-secondary">
            <Sparkles className="size-3" />
            <span>AI Actions</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-5 grid place-items-center rounded-sm text-tertiary hover:bg-layer-2 transition-colors"
          >
            <X className="size-3" />
          </button>
        </div>
        <div className="px-2 py-2">
          {isLoading && activeTask ? (
            <div className="flex items-center gap-2 px-1 py-2 text-13 text-secondary">
              <Loader2 className="size-3 animate-spin flex-shrink-0" />
              <span>{AI_TASK_LOADING_TEXTS[activeTask]}...</span>
            </div>
          ) : (
            AI_MENU_ITEMS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => handleAction(item.key)}
                disabled={isLoading}
                className={cn(
                  "w-full flex items-center gap-2 rounded-sm px-2 py-1.5 text-13 text-secondary hover:bg-layer-1 transition-colors text-left",
                  {
                    "opacity-50 cursor-not-allowed": isLoading,
                  }
                )}
              >
                <item.icon className="size-3 flex-shrink-0" />
                <span>{item.label}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(menuContent, document.body);
}

export type TAITextFieldWrapperProps = {
  children: React.ReactNode;
  inputRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  onAction: (task: AI_EDITOR_TASKS, text: string) => Promise<string | null>;
  enabled?: boolean;
};
