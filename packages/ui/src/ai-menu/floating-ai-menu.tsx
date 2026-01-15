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
  MessageSquare,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AI_EDITOR_TASKS, AI_TASK_LABELS, AI_TASK_LOADING_TEXTS } from "@plane/constants";
import { cn } from "../utils";

type AIMenuItem = {
  key: AI_EDITOR_TASKS;
  label: string;
  icon: LucideIcon;
};

type TonalityOption = {
  key: string;
  label: string;
  casual_score: number;
  formal_score: number;
};

const AI_QUICK_ACTIONS: AIMenuItem[] = [
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

const TONALITY_OPTIONS: TonalityOption[] = [
  {
    key: "default",
    label: "Par défaut",
    casual_score: 5,
    formal_score: 5,
  },
  {
    key: "professional",
    label: "💼 Professionnel",
    casual_score: 0,
    formal_score: 10,
  },
  {
    key: "casual",
    label: "😃 Décontracté",
    casual_score: 10,
    formal_score: 0,
  },
];

export type TAIActionPayload = {
  task: AI_EDITOR_TASKS;
  text: string;
  casual_score?: number;
  formal_score?: number;
  prompt?: string;
};

export type TFloatingAIMenuProps = {
  isVisible: boolean;
  position: { x: number; y: number };
  selectedText: string;
  onClose: () => void;
  onAction: (payload: TAIActionPayload) => Promise<string | null>;
  onReplace: (newText: string) => void;
  menuRef?: React.RefObject<HTMLDivElement>;
};

export function FloatingAIMenu(props: TFloatingAIMenuProps) {
  const { isVisible, position, selectedText, onClose, onAction, onReplace, menuRef } = props;
  const [isLoading, setIsLoading] = useState(false);
  const [activeTask, setActiveTask] = useState<AI_EDITOR_TASKS | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showAskPi, setShowAskPi] = useState(false);
  const [askPiPrompt, setAskPiPrompt] = useState("");
  const [selectedTonality, setSelectedTonality] = useState<TonalityOption>(TONALITY_OPTIONS[0]);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const handleQuickAction = useCallback(
    async (task: AI_EDITOR_TASKS) => {
      if (!selectedText.trim() || isLoading) return;

      setIsLoading(true);
      setActiveTask(task);

      try {
        const response = await onAction({ task, text: selectedText });
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

  const handleAskPi = useCallback(async () => {
    if (!selectedText.trim() || !askPiPrompt.trim() || isLoading) return;

    setIsLoading(true);
    setActiveTask(AI_EDITOR_TASKS.ASK_ANYTHING);

    try {
      const response = await onAction({
        task: AI_EDITOR_TASKS.ASK_ANYTHING,
        text: selectedText,
        prompt: askPiPrompt,
        casual_score: selectedTonality.casual_score,
        formal_score: selectedTonality.formal_score,
      });
      if (response) {
        onReplace(response);
      }
    } finally {
      setIsLoading(false);
      setActiveTask(null);
      setShowAskPi(false);
      setAskPiPrompt("");
      onClose();
    }
  }, [selectedText, isLoading, onAction, onReplace, onClose, askPiPrompt, selectedTonality]);

  useEffect(() => {
    if (!isVisible) {
      setIsLoading(false);
      setActiveTask(null);
      setShowAskPi(false);
      setAskPiPrompt("");
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
      <div className="flex flex-col rounded-lg border border-subtle-1 bg-surface-1 shadow-raised-200 overflow-hidden min-w-[240px]">
        <div className="flex items-center justify-between px-3 py-2 border-b border-subtle-1 bg-layer-1">
          <div className="flex items-center gap-2 text-13 font-medium text-secondary">
            {showAskPi ? (
              <>
                <button
                  type="button"
                  onClick={() => setShowAskPi(false)}
                  className="p-0.5 rounded hover:bg-layer-2 transition-colors"
                >
                  <ArrowLeft className="size-3" />
                </button>
                <MessageSquare className="size-3" />
                <span>Ask Pi</span>
              </>
            ) : (
              <>
                <Sparkles className="size-3" />
                <span>AI Actions</span>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-5 grid place-items-center rounded-sm text-tertiary hover:bg-layer-2 transition-colors"
          >
            <X className="size-3" />
          </button>
        </div>

        {isLoading && activeTask ? (
          <div className="flex items-center gap-2 px-3 py-4 text-13 text-secondary">
            <Loader2 className="size-4 animate-spin flex-shrink-0" />
            <span>{AI_TASK_LOADING_TEXTS[activeTask]}...</span>
          </div>
        ) : showAskPi ? (
          <div className="p-3 flex flex-col gap-3">
            <textarea
              value={askPiPrompt}
              onChange={(e) => setAskPiPrompt(e.target.value)}
              placeholder="Posez votre question..."
              className="w-full h-20 px-2 py-1.5 text-13 bg-layer-1 border border-subtle-1 rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-accent-primary"
              autoFocus
            />
            <div className="flex flex-col gap-2">
              <span className="text-11 text-tertiary font-medium">Tonalité</span>
              <div className="flex flex-wrap gap-1.5">
                {TONALITY_OPTIONS.map((tone) => (
                  <button
                    key={tone.key}
                    type="button"
                    onClick={() => setSelectedTonality(tone)}
                    className={cn(
                      "px-2 py-1 text-11 rounded-md transition-colors",
                      selectedTonality.key === tone.key
                        ? "bg-accent-primary/20 text-accent-primary"
                        : "bg-layer-1 text-secondary hover:bg-layer-2"
                    )}
                  >
                    {tone.label}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={handleAskPi}
              disabled={!askPiPrompt.trim()}
              className={cn(
                "w-full py-2 text-13 font-medium rounded-md transition-colors",
                askPiPrompt.trim()
                  ? "bg-accent-primary text-on-color hover:bg-accent-primary/90"
                  : "bg-layer-1 text-tertiary cursor-not-allowed"
              )}
            >
              Envoyer
            </button>
          </div>
        ) : (
          <div className="py-2">
            <div className="px-3 pb-1.5 mb-1">
              <span className="text-11 text-tertiary font-medium">Actions rapides</span>
            </div>
            {AI_QUICK_ACTIONS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => handleQuickAction(item.key)}
                disabled={isLoading}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-1.5 text-13 text-secondary hover:bg-layer-1 transition-colors text-left",
                  { "opacity-50 cursor-not-allowed": isLoading }
                )}
              >
                <item.icon className="size-3.5 flex-shrink-0" />
                <span>{item.label}</span>
              </button>
            ))}
            <div className="px-2 pt-1.5 mt-1 border-t border-subtle-1">
              <button
                type="button"
                onClick={() => setShowAskPi(true)}
                className="w-full flex items-center justify-between gap-2 px-1 py-1.5 text-13 text-secondary hover:bg-layer-1 rounded-sm transition-colors"
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="size-3.5 flex-shrink-0" />
                  <span>Ask Pi</span>
                </div>
                <ChevronRight className="size-3 flex-shrink-0 text-tertiary" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(menuContent, document.body);
}
