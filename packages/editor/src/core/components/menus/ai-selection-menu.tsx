import type { Editor } from "@tiptap/react";
import { useState, useCallback } from "react";
import {
  Sparkles,
  FileText,
  Expand,
  Minimize2,
  Heading,
  Loader2,
  MessageSquare,
  ChevronRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ChevronDownIcon } from "@plane/propel/icons";
import { cn } from "@plane/utils";
import { AI_EDITOR_TASKS, AI_TASK_LABELS, AI_TASK_LOADING_TEXTS } from "@plane/constants";
import { FloatingMenuRoot } from "./floating-menu/root";
import { useFloatingMenu } from "./floating-menu/use-floating-menu";

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

type Props = {
  editor: Editor;
  onAction: (payload: TAIActionPayload) => Promise<string | null>;
};

export function AISelectionMenu(props: Props) {
  const { editor, onAction } = props;
  const [isLoading, setIsLoading] = useState(false);
  const [activeTask, setActiveTask] = useState<AI_EDITOR_TASKS | null>(null);
  const [showAskPi, setShowAskPi] = useState(false);
  const [askPiPrompt, setAskPiPrompt] = useState("");
  const [selectedTonality, setSelectedTonality] = useState<TonalityOption>(TONALITY_OPTIONS[0]);
  const { options, getReferenceProps, getFloatingProps } = useFloatingMenu({});
  const { context } = options;

  const getSelectedText = useCallback(() => {
    const { from, to } = editor.state.selection;
    return editor.state.doc.textBetween(from, to, " ");
  }, [editor]);

  const handleQuickAction = useCallback(
    async (task: AI_EDITOR_TASKS) => {
      const selectedText = getSelectedText();
      if (!selectedText.trim()) return;

      setIsLoading(true);
      setActiveTask(task);

      try {
        const response = await onAction({ task, text: selectedText });
        if (response) {
          editor.chain().focus().deleteSelection().insertContent(response).run();
        }
      } finally {
        setIsLoading(false);
        setActiveTask(null);
        context.onOpenChange(false);
      }
    },
    [editor, onAction, context, getSelectedText]
  );

  const handleAskPi = useCallback(async () => {
    const selectedText = getSelectedText();
    if (!selectedText.trim() || !askPiPrompt.trim()) return;

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
        editor.chain().focus().deleteSelection().insertContent(response).run();
      }
    } finally {
      setIsLoading(false);
      setActiveTask(null);
      setShowAskPi(false);
      setAskPiPrompt("");
      context.onOpenChange(false);
    }
  }, [editor, onAction, context, getSelectedText, askPiPrompt, selectedTonality]);

  const handleClose = useCallback(() => {
    setShowAskPi(false);
    setAskPiPrompt("");
    context.onOpenChange(false);
  }, [context]);

  return (
    <FloatingMenuRoot
      classNames={{
        buttonContainer: "h-full",
        button: cn(
          "h-full flex items-center gap-1 px-2 text-13 font-medium text-tertiary hover:bg-layer-1 active:bg-layer-1 rounded-sm whitespace-nowrap transition-colors",
          {
            "bg-layer-1": context.open,
          }
        ),
      }}
      menuButton={
        <>
          {isLoading ? (
            <Loader2 className="shrink-0 size-4 animate-spin" />
          ) : (
            <Sparkles className="shrink-0 size-4" />
          )}
          <span>AI</span>
          <ChevronDownIcon className="shrink-0 size-3" />
        </>
      }
      options={options}
      getFloatingProps={getFloatingProps}
      getReferenceProps={getReferenceProps}
    >
      <section className="w-64 max-h-[90vh] mt-1 flex flex-col rounded-md border-[0.5px] border-strong bg-surface-1 shadow-raised-200 overflow-hidden">
        {isLoading && activeTask ? (
          <div className="flex items-center gap-2 px-3 py-4 text-13 text-secondary">
            <Loader2 className="size-4 animate-spin flex-shrink-0" />
            <span>{AI_TASK_LOADING_TEXTS[activeTask]}...</span>
          </div>
        ) : showAskPi ? (
          <div className="flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 border-b border-subtle-1">
              <div className="flex items-center gap-2 text-13 font-medium text-secondary">
                <MessageSquare className="size-3" />
                <span>Ask Pi</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAskPi(false)}
                className="text-11 text-tertiary hover:text-secondary"
              >
                Retour
              </button>
            </div>
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
          </div>
        ) : (
          <div className="py-2">
            <div className="px-2 pb-1.5 mb-1.5 border-b border-subtle-1">
              <span className="text-11 text-tertiary font-medium px-1">Actions rapides</span>
            </div>
            {AI_QUICK_ACTIONS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleQuickAction(item.key);
                }}
                disabled={isLoading}
                className={cn(
                  "w-full flex items-center gap-2 rounded-sm px-3 py-1.5 text-13 text-secondary hover:bg-layer-1 transition-colors",
                  { "opacity-50 cursor-not-allowed": isLoading }
                )}
              >
                <item.icon className="size-3.5 flex-shrink-0" />
                <span>{item.label}</span>
              </button>
            ))}
            <div className="px-2 py-1.5 mt-1.5 border-t border-subtle-1">
              <button
                type="button"
                onClick={() => setShowAskPi(true)}
                className="w-full flex items-center justify-between gap-2 rounded-sm px-1 py-1.5 text-13 text-secondary hover:bg-layer-1 transition-colors"
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
      </section>
    </FloatingMenuRoot>
  );
}
