import React, { useEffect, useState, useCallback, useRef } from "react";
import type { LucideIcon } from "lucide-react";
import { Globe2, Lock, Mic } from "lucide-react";
import { EIssueCommentAccessSpecifier } from "@plane/constants";
import type { EditorRefApi } from "@plane/editor";
import { useTranslation } from "@plane/i18n";
import { Button } from "@plane/propel/button";
import { Tooltip } from "@plane/propel/tooltip";
import { cn } from "@plane/utils";
import { VoiceAssistantModal } from "@plane/ui";
import type { ToolbarMenuItem } from "@/constants/editor";
import { TOOLBAR_ITEMS } from "@/constants/editor";

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
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const micButtonRef = useRef<HTMLButtonElement>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  const handleVoiceResult = useCallback(
    (text: string) => {
      if (editorRef) {
        editorRef.insertTextAtCursor(text + " ");
      }
    },
    [editorRef]
  );

  const handleMicClick = useCallback(() => {
    if (micButtonRef.current) {
      setAnchorRect(micButtonRef.current.getBoundingClientRect());
    }
    setIsVoiceModalOpen(true);
  }, []);

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
                  ref={micButtonRef}
                  type="button"
                  onClick={handleMicClick}
                  className="grid place-items-center size-7 rounded-sm transition-all text-placeholder hover:bg-layer-1 hover:text-secondary"
                >
                  <Mic className="size-3.5" />
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

      <VoiceAssistantModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onResult={handleVoiceResult}
        language="fr-FR"
        anchorRect={anchorRect}
      />
    </>
  );
}
