import { forwardRef, useCallback, useState, useRef } from "react";
import { AI_EDITOR_TASKS } from "@plane/constants";
import { RichTextEditorWithRef } from "@plane/editor";
import type { EditorRefApi, IRichTextEditorProps, TAIActionPayload, TFileHandler } from "@plane/editor";
import type { MakeOptional, TSearchEntityRequestPayload, TSearchResponse } from "@plane/types";
import { cn } from "@plane/utils";
import { VoiceAssistantModal } from "@plane/ui";
import { EditorMentionsRoot } from "@/components/editor/embeds/mentions";
import { useEditorConfig, useEditorMention } from "@/hooks/editor";
import { useMember } from "@/hooks/store/use-member";
import { useParseEditorContent } from "@/hooks/use-parse-editor-content";
import { useEditorFlagging } from "@/plane-web/hooks/use-editor-flagging";
import { AIService } from "@/services/ai.service";

type RichTextEditorWrapperProps = MakeOptional<
  Omit<IRichTextEditorProps, "fileHandler" | "mentionHandler" | "extendedEditorProps">,
  "disabledExtensions" | "editable" | "flaggedExtensions" | "getEditorMetaData"
> & {
  workspaceSlug: string;
  workspaceId: string;
  projectId?: string;
  issueSequenceId?: number;
  } & (
    | {
        editable: false;
      }
    | {
        editable: true;
        searchMentionCallback: (payload: TSearchEntityRequestPayload) => Promise<TSearchResponse>;
        uploadFile: TFileHandler["upload"];
        duplicateFile: TFileHandler["duplicate"];
      }
  );

export const RichTextEditor = forwardRef(function RichTextEditor(
  props: RichTextEditorWrapperProps,
  ref: React.ForwardedRef<EditorRefApi>
) {
  const {
    containerClassName,
    editable,
    workspaceSlug,
    workspaceId,
    projectId,
    disabledExtensions: additionalDisabledExtensions = [],
    ...rest
  } = props;

  const { getUserDetails } = useMember();
  const { richText: richTextEditorExtensions } = useEditorFlagging({
    workspaceSlug,
    projectId,
  });
  const { fetchMentions } = useEditorMention({
    searchEntity: editable ? async (payload) => await props.searchMentionCallback(payload) : async () => ({}),
  });
  const { getEditorFileHandlers } = useEditorConfig();
  const { getEditorMetaData } = useParseEditorContent({
    projectId,
    workspaceSlug,
  });

  const editorRefInternal = useRef<EditorRefApi | null>(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [currentNodeInfo, setCurrentNodeInfo] = useState<{ from: number; to: number } | null>(null);

  const handleVoiceResult = useCallback(
    (text: string) => {
      console.log('[Editor] handleVoiceResult called with:', text);
      console.log('[Editor] editorRefInternal.current:', !!editorRefInternal.current);
      
      if (!editorRefInternal.current) {
        console.error('[Editor] No editor ref available!');
        return;
      }
      const editor = editorRefInternal.current;

      try {
        if (currentNodeInfo && currentNodeInfo.from !== currentNodeInfo.to) {
          console.log('[Editor] Replacing node at:', currentNodeInfo);
          const view = (editor as any).editor?.view;
          if (view) {
            const { state, dispatch } = view;
            const tr = state.tr.insertText(text, currentNodeInfo.from, currentNodeInfo.to);
            dispatch(tr);
            console.log('[Editor] Node replaced successfully');
          } else {
            console.log('[Editor] No view, falling back to insertTextAtCursor');
            editor.insertTextAtCursor(text + " ");
          }
        } else {
          console.log('[Editor] Inserting at cursor');
          editor.insertTextAtCursor(text + " ");
          console.log('[Editor] Text inserted successfully');
        }
      } catch (e) {
        console.error('[Editor] Error, trying fallback:', e);
        try {
          editor.insertTextAtCursor(text + " ");
          console.log('[Editor] Fallback insert successful');
        } catch (e2) {
          console.error('[Editor] Fallback also failed:', e2);
        }
      }
      setCurrentNodeInfo(null);
    },
    [currentNodeInfo]
  );

  const speechHandler = {
    onStart: (nodeInfo?: { from: number; to: number }) => {
      setCurrentNodeInfo(nodeInfo || null);
      setIsVoiceModalOpen(true);
    },
    onStop: () => {
      setIsVoiceModalOpen(false);
      setCurrentNodeInfo(null);
    },
    isRecording: () => isVoiceModalOpen,
  };

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
      } catch (error) {
        console.error("AI action failed:", error);
        return null;
      }
    },
    [workspaceSlug]
  );

  const handleRef = useCallback(
    (editorRef: EditorRefApi | null) => {
      editorRefInternal.current = editorRef;
      if (typeof ref === "function") {
        ref(editorRef);
      } else if (ref) {
        ref.current = editorRef;
      }
    },
    [ref]
  );

  return (
    <>
      <RichTextEditorWithRef
        ref={handleRef}
        disabledExtensions={[...richTextEditorExtensions.disabled, ...(additionalDisabledExtensions ?? [])]}
        editable={editable}
        flaggedExtensions={richTextEditorExtensions.flagged}
        fileHandler={getEditorFileHandlers({
          projectId,
          uploadFile: editable ? props.uploadFile : async () => "",
          duplicateFile: editable ? props.duplicateFile : async () => "",
          workspaceId,
          workspaceSlug,
        })}
        getEditorMetaData={getEditorMetaData}
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
        extendedEditorProps={{}}
        aiHandler={{
          onSelectionAction: handleAISelectionAction,
        }}
        speechHandler={editable ? speechHandler : undefined}
        {...rest}
        containerClassName={cn("relative pl-3 pb-3", containerClassName)}
      />

      <VoiceAssistantModal
        isOpen={isVoiceModalOpen}
        onClose={() => {
          setIsVoiceModalOpen(false);
          setCurrentNodeInfo(null);
        }}
        onResult={handleVoiceResult}
        language="fr-FR"
        workspaceSlug={workspaceSlug}
      />
    </>
  );
});

RichTextEditor.displayName = "RichTextEditor";
