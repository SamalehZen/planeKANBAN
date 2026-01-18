import React, { useState, useCallback } from "react";
// plane constants
import { AI_EDITOR_TASKS, type EIssueCommentAccessSpecifier } from "@plane/constants";
// plane imports
import { LiteTextEditorWithRef } from "@plane/editor";
import type { EditorRefApi, ILiteTextEditorProps, TAIActionPayload, TFileHandler } from "@plane/editor";
import { useTranslation } from "@plane/i18n";
import { TOAST_TYPE, setToast } from "@plane/propel/toast";
import type { MakeOptional } from "@plane/types";
import { cn, isCommentEmpty } from "@plane/utils";
// components
import { EditorMentionsRoot } from "@/components/editor/embeds/mentions";
import { IssueCommentToolbar } from "@/components/editor/lite-text/toolbar";
// hooks
import { useEditorConfig, useEditorMention } from "@/hooks/editor";
import { useMember } from "@/hooks/store/use-member";
import { useParseEditorContent } from "@/hooks/use-parse-editor-content";
// plane web hooks
import { useEditorFlagging } from "@/plane-web/hooks/use-editor-flagging";
// plane web service
import { WorkspaceService } from "@/plane-web/services";
import { LiteToolbar } from "./lite-toolbar";
// services
import { AIService } from "@/services/ai.service";
const workspaceService = new WorkspaceService();

type LiteTextEditorWrapperProps = MakeOptional<
  Omit<ILiteTextEditorProps, "fileHandler" | "mentionHandler" | "extendedEditorProps">,
  "disabledExtensions" | "flaggedExtensions" | "getEditorMetaData"
> & {
  workspaceSlug: string;
  workspaceId: string;
  projectId?: string;
  accessSpecifier?: EIssueCommentAccessSpecifier;
  handleAccessChange?: (accessKey: EIssueCommentAccessSpecifier) => void;
  showAccessSpecifier?: boolean;
  showSubmitButton?: boolean;
  isSubmitting?: boolean;
  showToolbarInitially?: boolean;
  variant?: "full" | "lite" | "none";
  issue_id?: string;
  parentClassName?: string;
  editorClassName?: string;
  submitButtonText?: string;
} & (
    | {
        editable: false;
      }
    | {
        editable: true;
        uploadFile: TFileHandler["upload"];
        duplicateFile: TFileHandler["duplicate"];
      }
  );

export const LiteTextEditor = React.forwardRef(function LiteTextEditor(
  props: LiteTextEditorWrapperProps,
  ref: React.ForwardedRef<EditorRefApi>
) {
  const { t } = useTranslation();
  const {
    containerClassName,
    editable,
    workspaceSlug,
    workspaceId,
    projectId,
    issue_id,
    accessSpecifier,
    handleAccessChange,
    showAccessSpecifier = false,
    showSubmitButton = true,
    isSubmitting = false,
    showToolbarInitially = true,
    variant = "full",
    parentClassName = "",
    placeholder = t("issue.comments.placeholder"),
    disabledExtensions: additionalDisabledExtensions = [],
    editorClassName = "",
    showPlaceholderOnEmpty = true,
    submitButtonText = "common.comment",
    ...rest
  } = props;
  // states
  const isLiteVariant = variant === "lite";
  const isFullVariant = variant === "full";
  const [isFocused, setIsFocused] = useState(isFullVariant ? showToolbarInitially : true);
  const [editorRef, setEditorRef] = useState<EditorRefApi | null>(null);
  // editor flaggings
  const { liteText: liteTextEditorExtensions } = useEditorFlagging({
    workspaceSlug,
    projectId,
  });
  // store hooks
  const { getUserDetails } = useMember();
  // parse content
  const { getEditorMetaData } = useParseEditorContent({
    projectId,
    workspaceSlug,
  });
  // use editor mention
  const { fetchMentions } = useEditorMention({
    searchEntity: async (payload) =>
      await workspaceService.searchEntity(workspaceSlug, {
        ...payload,
        project_id: projectId,
        issue_id,
      }),
  });
  // editor config
  const { getEditorFileHandlers } = useEditorConfig();
  function isMutableRefObject<T>(ref: React.ForwardedRef<T>): ref is React.MutableRefObject<T | null> {
    return !!ref && typeof ref === "object" && "current" in ref;
  }
  // derived values
  const isEmpty = isCommentEmpty(props.initialValue);

  const handleAISelectionAction = useCallback(
    async (payload: TAIActionPayload): Promise<string | null> => {
      if (!workspaceSlug) return null;
      try {
        const aiService = new AIService();
        let prompt = "";
        switch (payload.task) {
          case AI_EDITOR_TASKS.PARAPHRASE:
            prompt = `Paraphrase le texte suivant en gardant le même sens mais avec des mots différents:\n\n${payload.text}`;
            break;
          case AI_EDITOR_TASKS.SIMPLIFY:
            prompt = `Simplifie le texte suivant pour le rendre plus facile à comprendre:\n\n${payload.text}`;
            break;
          case AI_EDITOR_TASKS.EXPAND:
            prompt = `Développe et enrichis le texte suivant avec plus de détails:\n\n${payload.text}`;
            break;
          case AI_EDITOR_TASKS.SUMMARIZE:
            prompt = `Résume le texte suivant de manière concise:\n\n${payload.text}`;
            break;
          case AI_EDITOR_TASKS.GENERATE_TITLE:
            prompt = `Génère un titre court et accrocheur pour le texte suivant:\n\n${payload.text}`;
            break;
          case AI_EDITOR_TASKS.ASK_ANYTHING:
            prompt = payload.prompt ? `${payload.prompt}\n\nTexte: ${payload.text}` : payload.text;
            break;
          default:
            prompt = payload.text;
        }
        const result = await aiService.createGptTask(workspaceSlug, {
          prompt,
          task: payload.task,
        });
        return result?.response || null;
      } catch (error: any) {
        console.error("AI action failed:", error);
        const errMsg = error?.data?.error || "Erreur IA";
        if (errMsg.includes("API key") || errMsg.includes("Configuration AI")) {
          setToast({
            type: TOAST_TYPE.ERROR,
            title: "Erreur!",
            message: "Clé API non configurée. Allez dans Admin > AI Settings pour configurer MiMo.",
          });
        } else {
          setToast({
            type: TOAST_TYPE.ERROR,
            title: "Erreur!",
            message: errMsg,
          });
        }
        return null;
      }
    },
    [workspaceSlug]
  );

  return (
    <div
      className={cn(
        "relative border border-subtle rounded-sm",
        {
          "p-3": editable && !isLiteVariant,
        },
        parentClassName
      )}
      onFocus={() => isFullVariant && !showToolbarInitially && setIsFocused(true)}
      onBlur={() => isFullVariant && !showToolbarInitially && setIsFocused(false)}
    >
      {/* Wrapper for lite toolbar layout */}
      <div className={cn(isLiteVariant && editable ? "flex items-end gap-1" : "")}>
        {/* Main Editor - always rendered once */}
        <div className={cn(isLiteVariant && editable ? "flex-1 min-w-0" : "")}>
          <LiteTextEditorWithRef
            ref={ref}
            disabledExtensions={[...liteTextEditorExtensions.disabled, ...additionalDisabledExtensions]}
            editable={editable}
            flaggedExtensions={liteTextEditorExtensions.flagged}
            fileHandler={getEditorFileHandlers({
              projectId,
              uploadFile: editable ? props.uploadFile : async () => "",
              duplicateFile: editable ? props.duplicateFile : async () => "",
              workspaceId,
              workspaceSlug,
            })}
            getEditorMetaData={getEditorMetaData}
            handleEditorReady={(ready) => {
              if (ready) {
                setEditorRef(isMutableRefObject<EditorRefApi>(ref) ? ref.current : null);
              }
            }}
            mentionHandler={{
              searchCallback: async (query) => {
                const res = await fetchMentions(query);
                if (!res) throw new Error("Failed in fetching mentions");
                return res;
              },
              renderComponent: EditorMentionsRoot,
              getMentionedEntityDetails: (id) => ({
                display_name: getUserDetails(id)?.display_name ?? "",
              }),
            }}
            placeholder={placeholder}
            showPlaceholderOnEmpty={showPlaceholderOnEmpty}
            containerClassName={cn(containerClassName, "relative", {
              "p-2": !editable,
            })}
            extendedEditorProps={{}}
            aiHandler={{
              onSelectionAction: handleAISelectionAction,
            }}
            editorClassName={editorClassName}
            {...rest}
          />
        </div>

        {/* Lite Toolbar - conditionally rendered */}
        {isLiteVariant && editable && (
          <LiteToolbar
            executeCommand={(item) => {
              // TODO: update this while toolbar homogenization
              // @ts-expect-error type mismatch here
              editorRef?.executeMenuItemCommand({
                itemKey: item.itemKey,
                ...item.extraProps,
              });
            }}
            onSubmit={(e) => rest.onEnterKeyPress?.(e)}
            isSubmitting={isSubmitting}
            isEmpty={isEmpty}
          />
        )}
      </div>

      {/* Full Toolbar - conditionally rendered */}
      {isFullVariant && editable && (
        <div
          className={cn(
            "transition-all duration-300 ease-out origin-top overflow-hidden",
            isFocused ? "max-h-[200px] opacity-100 scale-y-100 mt-3" : "max-h-0 opacity-0 scale-y-0 invisible"
          )}
        >
          <IssueCommentToolbar
            accessSpecifier={accessSpecifier}
            executeCommand={(item) => {
              // TODO: update this while toolbar homogenization
              // @ts-expect-error type mismatch here
              editorRef?.executeMenuItemCommand({
                itemKey: item.itemKey,
                ...item.extraProps,
              });
            }}
            handleAccessChange={handleAccessChange}
            handleSubmit={(e) => rest.onEnterKeyPress?.(e)}
            isCommentEmpty={isEmpty}
            isSubmitting={isSubmitting}
            showAccessSpecifier={showAccessSpecifier}
            editorRef={editorRef}
            showSubmitButton={showSubmitButton}
            submitButtonText={submitButtonText}
            workspaceSlug={workspaceSlug}
          />
        </div>
      )}
    </div>
  );
});

LiteTextEditor.displayName = "LiteTextEditor";
