import { forwardRef, useCallback, useState, useRef, useEffect } from "react";
// plane imports
import { AI_EDITOR_TASKS } from "@plane/constants";
import { RichTextEditorWithRef } from "@plane/editor";
import type { EditorRefApi, IRichTextEditorProps, TAIActionPayload, TFileHandler } from "@plane/editor";
import { useSpeechToText } from "@plane/hooks";
import type { MakeOptional, TSearchEntityRequestPayload, TSearchResponse } from "@plane/types";
import { cn } from "@plane/utils";
// components
import { EditorMentionsRoot } from "@/components/editor/embeds/mentions";
// hooks
import { useEditorConfig, useEditorMention } from "@/hooks/editor";
import { useMember } from "@/hooks/store/use-member";
import { useParseEditorContent } from "@/hooks/use-parse-editor-content";
// plane web hooks
import { useEditorFlagging } from "@/plane-web/hooks/use-editor-flagging";
// services
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
  // store hooks
  const { getUserDetails } = useMember();
  // editor flaggings
  const { richText: richTextEditorExtensions } = useEditorFlagging({
    workspaceSlug,
    projectId,
  });
  // use editor mention
  const { fetchMentions } = useEditorMention({
    searchEntity: editable ? async (payload) => await props.searchMentionCallback(payload) : async () => ({}),
  });
  // editor config
  const { getEditorFileHandlers } = useEditorConfig();
  // parse content
  const { getEditorMetaData } = useParseEditorContent({
    projectId,
    workspaceSlug,
  });

  // Speech-to-text integration
  const editorRefInternal = useRef<EditorRefApi | null>(null);
  const [isRecordingState, setIsRecordingState] = useState(false);
  const [currentNodeInfo, setCurrentNodeInfo] = useState<{ from: number; to: number } | null>(null);
  const streamingTextRef = useRef<string>("");

  const handleSpeechTranscript = useCallback(
    (text: string, isFinal: boolean) => {
      if (!editorRefInternal.current) return;
      
      const editor = editorRefInternal.current;
      
      if (currentNodeInfo) {
        if (isFinal) {
          streamingTextRef.current = "";
        } else {
          streamingTextRef.current = text;
          try {
            const view = (editor as any).editor?.view;
            if (view) {
              const { state, dispatch } = view;
              const tr = state.tr.replaceWith(
                currentNodeInfo.from,
                currentNodeInfo.to,
                state.schema.text(text || " ")
              );
              dispatch(tr);
              setCurrentNodeInfo({
                from: currentNodeInfo.from,
                to: currentNodeInfo.from + (text?.length || 1),
              });
            }
          } catch (e) {
            console.error("Error updating text:", e);
          }
        }
      } else {
        if (isFinal) {
          editor.insertTextAtCursor(text + " ");
        }
      }
    },
    [currentNodeInfo]
  );

  const {
    isRecording,
    startRecording,
    stopRecording,
  } = useSpeechToText({
    workspaceSlug: workspaceSlug || "",
    onTranscript: handleSpeechTranscript,
  });

  useEffect(() => {
    setIsRecordingState(isRecording);
  }, [isRecording]);

  const speechHandler = {
    onStart: (nodeInfo?: { from: number; to: number }) => {
      setCurrentNodeInfo(nodeInfo || null);
      streamingTextRef.current = "";
      startRecording();
    },
    onStop: () => {
      stopRecording();
      setCurrentNodeInfo(null);
      streamingTextRef.current = "";
    },
    isRecording: () => isRecordingState,
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
  );
});

RichTextEditor.displayName = "RichTextEditor";
