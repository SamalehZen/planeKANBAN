import type { Editor } from "@tiptap/react";
import { useState, useCallback } from "react";
import {
  Sparkles,
  FileText,
  Expand,
  Minimize2,
  Heading,
  Loader2,
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

type Props = {
  editor: Editor;
  onAction: (task: AI_EDITOR_TASKS, selectedText: string) => Promise<string | null>;
};

export function AISelectionMenu(props: Props) {
  const { editor, onAction } = props;
  const [isLoading, setIsLoading] = useState(false);
  const [activeTask, setActiveTask] = useState<AI_EDITOR_TASKS | null>(null);
  const { options, getReferenceProps, getFloatingProps } = useFloatingMenu({});
  const { context } = options;

  const handleAction = useCallback(
    async (task: AI_EDITOR_TASKS) => {
      const { from, to } = editor.state.selection;
      const selectedText = editor.state.doc.textBetween(from, to, " ");

      if (!selectedText.trim()) return;

      setIsLoading(true);
      setActiveTask(task);

      try {
        const response = await onAction(task, selectedText);
        if (response) {
          editor.chain().focus().deleteSelection().insertContent(response).run();
        }
      } finally {
        setIsLoading(false);
        setActiveTask(null);
        context.onOpenChange(false);
      }
    },
    [editor, onAction, context]
  );

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
      <section className="w-52 max-h-[90vh] mt-1 flex flex-col overflow-y-scroll rounded-md border-[0.5px] border-strong bg-surface-1 px-2 py-2.5 shadow-raised-200">
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
              onClick={(e) => {
                e.stopPropagation();
                handleAction(item.key);
              }}
              disabled={isLoading}
              className={cn(
                "flex items-center gap-2 rounded-sm px-1 py-1.5 text-13 text-secondary hover:bg-layer-1 transition-colors",
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
      </section>
    </FloatingMenuRoot>
  );
}
