import React, { useEffect, useState, useCallback } from "react";
import type { LucideIcon } from "lucide-react";
import { Globe2, Lock, Loader2, Mic } from "lucide-react";
import { EIssueCommentAccessSpecifier } from "@plane/constants";
import type { EditorRefApi } from "@plane/editor";
import { useIntentFirstSpeech } from "@plane/hooks";
import type { TIntentType } from "@plane/services";
import { useTranslation } from "@plane/i18n";
import { Button } from "@plane/propel/button";
import { Tooltip } from "@plane/propel/tooltip";
import { cn } from "@plane/utils";
import type { ToolbarMenuItem } from "@/constants/editor";
import { TOOLBAR_ITEMS } from "@/constants/editor";
import { VoiceAssistantOverlay } from "@/components/speech";

type Props = {
  accessSpecifier?: EIssueCommentAccessSpecifier;
  executeCommand: (item: ToolbarMenuItem) => void;
  handleAccessChange?: (accessKey: EIssueCommentAccessSpecifier) => void;
  handleSubmit: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  isCommentEmpty: boolean;
  isSubmitting: boolean;
  showAccessSpecifier: boolean;
  showSubmitButton: boolean;
  editorRef: EditorRefApi | null;
  submitButtonText?: string;
  workspaceSlug?: string;
  speechEnabled?: boolean;
};

type TCommentAccessType = {
  icon: LucideIcon;
  key: EIssueCommentAccessSpecifier;
  label: "Private" | "Public";
};

const COMMENT_ACCESS_SPECIFIERS: TCommentAccessType[] = [
  {
    icon: Lock,
    key: EIssueCommentAccessSpecifier.INTERNAL,
    label: "Private",
  },
  {
    icon: Globe2,
    key: EIssueCommentAccessSpecifier.EXTERNAL,
    label: "Public",
  },
];

const toolbarItems = TOOLBAR_ITEMS.lite;

export function IssueCommentToolbar(props: Props) {
  const { t } = useTranslation();
  const {
    accessSpecifier,
    executeCommand,
    handleAccessChange,
    handleSubmit,
    isCommentEmpty,
    isSubmitting,
    showAccessSpecifier,
    showSubmitButton,
    editorRef,
    submitButtonText = "common.comment",
    workspaceSlug,
    speechEnabled = true,
  } = props;

  const [activeStates, setActiveStates] = useState<Record<string, boolean>>({});
  const [showVoiceOverlay, setShowVoiceOverlay] = useState(false);
  const [uiState, setUiState] = useState<"menu" | "listening" | "processing" | "result">("menu");

  const handleContentReady = useCallback(
    (content: string, intent: TIntentType) => {
      if (!editorRef || !content) return;
      
      console.log("[LiteTextToolbar] Inserting content:", { content, intent });
      
      if (intent === "todo") {
        const lines = content.split('\n').filter(l => l.trim());
        const taskItems: string[] = [];
        
        for (const line of lines) {
          const text = line.replace(/^-\s*\[[ x]\]\s*/, '').replace(/^[-•]\s*/, '').trim();
          if (text) {
            taskItems.push(`<li data-type="taskItem" data-checked="false"><p>✅ ${text}</p></li>`);
          }
        }
        
        if (taskItems.length > 0) {
          const html = `<p><strong>📋 Tâches:</strong></p><ul data-type="taskList">${taskItems.join('')}</ul>`;
          editorRef.insertContentAtCursor(html);
        } else {
          editorRef.insertTextAtCursor(content + " ");
        }
      } else if (intent === "note") {
        const cleanContent = content.replace(/^[📝💡]\s*/, '').trim();
        const html = `<blockquote><p>📝 <strong>Note:</strong> ${cleanContent}</p></blockquote>`;
        editorRef.insertContentAtCursor(html);
      } else if (intent === "planning") {
        const lines = content.split('\n').filter(l => l.trim());
        const planItems: string[] = [];
        
        for (const line of lines) {
          const text = line.replace(/^[-•📅🗓️]\s*/, '').replace(/^-\s*\[[ x]\]\s*/, '').trim();
          if (text) {
            planItems.push(`<li data-type="taskItem" data-checked="false"><p>📅 ${text}</p></li>`);
          }
        }
        
        if (planItems.length > 0) {
          const html = `<p><strong>🗓️ Planning:</strong></p><ul data-type="taskList">${planItems.join('')}</ul>`;
          editorRef.insertContentAtCursor(html);
        } else {
          editorRef.insertTextAtCursor(content + " ");
        }
      } else if (intent === "long_text") {
        let htmlContent = content;
        
        htmlContent = htmlContent
          .replace(/^## (.+)$/gm, '<h3>$1</h3>')
          .replace(/^### (.+)$/gm, '<h4>$1</h4>');
        
        htmlContent = htmlContent.replace(/^>\s*(.+)$/gm, '<blockquote><p>$1</p></blockquote>');
        htmlContent = htmlContent.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        htmlContent = htmlContent.replace(/\*(.+?)\*/g, '<em>$1</em>');
        
        const paragraphs = htmlContent.split('\n\n').filter(p => p.trim());
        htmlContent = paragraphs.map(p => {
          if (p.startsWith('<h') || p.startsWith('<blockquote')) {
            return p;
          }
          return `<p>${p.replace(/\n/g, '<br/>')}</p>`;
        }).join('');
        
        const html = `<p><strong>📄 Document:</strong></p>${htmlContent}`;
        editorRef.insertContentAtCursor(html);
      } else {
        editorRef.insertTextAtCursor(content + " ");
      }
      
      setUiState("result");
      setTimeout(() => {
        setShowVoiceOverlay(false);
        setUiState("menu");
      }, 1500);
    },
    [editorRef]
  );

  const speech = useIntentFirstSpeech({
    workspaceSlug: workspaceSlug || "",
    onResult: handleContentReady,
  });

  useEffect(() => {
    if (speech.isRecording) {
      setUiState("listening");
    } else if (speech.isProcessing) {
      setUiState("processing");
    }
  }, [speech.isRecording, speech.isProcessing]);

  const handleMicClick = useCallback(() => {
    setShowVoiceOverlay(true);
    setUiState("menu");
  }, []);

  const handleIntentSelect = useCallback(
    async (intent: TIntentType) => {
      setUiState("listening");
      await speech.startWithIntent(intent);
    },
    [speech]
  );

  const handleStop = useCallback(() => {
    speech.stopAndProcess();
    setUiState("processing");
  }, [speech]);

  const handleClose = useCallback(() => {
    setShowVoiceOverlay(false);
    setUiState("menu");
    speech.closeIntentPicker();
  }, [speech]);

  const isSpeechAvailable = speechEnabled && workspaceSlug;

  const updateActiveStates = useCallback(() => {
    if (!editorRef) return;
    const newActiveStates: Record<string, boolean> = {};
    Object.values(toolbarItems)
      .flat()
      .forEach((item) => {
        // @ts-expect-error type mismatch here
        newActiveStates[item.renderKey] = editorRef.isMenuItemActive({
          itemKey: item.itemKey,
          ...item.extraProps,
        });
      });
    setActiveStates(newActiveStates);
  }, [editorRef]);

  useEffect(() => {
    if (!editorRef) return;
    const unsubscribe = editorRef.onStateChange(updateActiveStates);
    updateActiveStates();
    return () => unsubscribe();
  }, [editorRef, updateActiveStates]);

  const isEditorReadyToDiscard = editorRef?.isEditorReadyToDiscard();
  const isSubmitButtonDisabled = isCommentEmpty || !isEditorReadyToDiscard;

  return (
    <>
      <div className="flex h-9 w-full items-stretch gap-1.5 bg-surface-2 overflow-x-scroll">
        {showAccessSpecifier && (
          <div className="flex flex-shrink-0 items-stretch gap-0.5 rounded-sm border-[0.5px] border-subtle p-1">
            {COMMENT_ACCESS_SPECIFIERS.map((access) => {
              const isAccessActive = accessSpecifier === access.key;

              return (
                <Tooltip key={access.key} tooltipContent={access.label}>
                  <button
                    type="button"
                    onClick={() => handleAccessChange?.(access.key)}
                    className={cn("grid place-items-center aspect-square rounded-xs p-1 hover:bg-layer-1", {
                      "bg-layer-1": isAccessActive,
                    })}
                  >
                    <access.icon
                      className={cn("h-3.5 w-3.5 text-placeholder", {
                        "text-primary": isAccessActive,
                      })}
                      strokeWidth={2}
                    />
                  </button>
                </Tooltip>
              );
            })}
          </div>
        )}
        <div className="flex w-full items-stretch justify-between gap-2 rounded-sm border-[0.5px] border-subtle p-1">
          <div className="flex items-stretch">
            {Object.keys(toolbarItems).map((key, index) => (
              <div
                key={key}
                className={cn("flex items-stretch gap-0.5 border-r border-subtle px-2.5", {
                  "pl-0": index === 0,
                })}
              >
                {toolbarItems[key].map((item) => {
                  const isItemActive = activeStates[item.renderKey];

                  return (
                    <Tooltip
                      key={item.renderKey}
                      tooltipContent={
                        <p className="flex flex-col gap-1 text-center text-11">
                          <span className="font-medium">{item.name}</span>
                          {item.shortcut && <kbd className="text-placeholder">{item.shortcut.join(" + ")}</kbd>}
                        </p>
                      }
                    >
                      <button
                        type="button"
                        onClick={() => executeCommand(item)}
                        className={cn(
                          "grid place-items-center aspect-square rounded-xs p-0.5 text-placeholder hover:bg-layer-1",
                          {
                            "bg-layer-1 text-primary": isItemActive,
                          }
                        )}
                      >
                        <item.icon
                          className={cn("h-3.5 w-3.5", {
                            "text-primary": isItemActive,
                          })}
                          strokeWidth={2.5}
                        />
                      </button>
                    </Tooltip>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1.5 sticky right-1">
            {isSpeechAvailable && (
              <Tooltip tooltipContent="Saisie vocale">
                <button
                  type="button"
                  onClick={handleMicClick}
                  disabled={speech.isConnecting}
                  className={cn(
                    "grid place-items-center size-7 rounded-sm transition-all",
                    "text-placeholder hover:bg-layer-1 hover:text-secondary",
                    { "opacity-50 cursor-not-allowed": speech.isConnecting }
                  )}
                >
                  {speech.isConnecting ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Mic className="size-3.5" />
                  )}
                </button>
              </Tooltip>
            )}
            {showSubmitButton && (
              <Button
                type="submit"
                variant="primary"
                className="px-2.5 py-1.5 text-11"
                onClick={handleSubmit}
                disabled={isSubmitButtonDisabled}
                loading={isSubmitting}
              >
                {t(submitButtonText)}
              </Button>
            )}
          </div>
        </div>
      </div>

      {showVoiceOverlay && (
        <VoiceAssistantOverlay
          state={uiState}
          intent={speech.selectedIntent}
          duration={speech.recordingDuration}
          volume={speech.currentVolume}
          onSelectIntent={handleIntentSelect}
          onStop={handleStop}
          onClose={handleClose}
        />
      )}
    </>
  );
}
