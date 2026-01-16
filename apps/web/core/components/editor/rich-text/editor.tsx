import { forwardRef, useCallback, useState, useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { AI_EDITOR_TASKS } from "@plane/constants";
import { RichTextEditorWithRef } from "@plane/editor";
import type { EditorRefApi, IRichTextEditorProps, TAIActionPayload, TFileHandler } from "@plane/editor";
import { useSmartSpeechToText } from "@plane/hooks";
import type { TIntentType } from "@plane/services";
import type { MakeOptional, TSearchEntityRequestPayload, TSearchResponse } from "@plane/types";
import { RecordingIndicator, IntentConfirmationModal } from "@plane/ui";
import { cn } from "@plane/utils";
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
    | { editable: false }
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
  const { richText: richTextEditorExtensions } = useEditorFlagging({ workspaceSlug, projectId });
  const { fetchMentions } = useEditorMention({
    searchEntity: editable ? async (payload) => await props.searchMentionCallback(payload) : async () => ({}),
  });
  const { getEditorFileHandlers } = useEditorConfig();
  const { getEditorMetaData } = useParseEditorContent({ projectId, workspaceSlug });

  const editorRefInternal = useRef<EditorRefApi | null>(null);
  const [currentNodeInfo, setCurrentNodeInfo] = useState<{ from: number; to: number } | null>(null);

  const insertContent = useCallback((intent: TIntentType, content: string) => {
    const editor = editorRefInternal.current;
    if (!editor || !content) return;
    
    if (intent === "todo" || intent === "planning") {
      const lines = content.split('\n').filter(l => l.trim());
      const taskItems = lines
        .filter(l => l.match(/^-\s*\[[ x]\]/))
        .map(l => {
          const text = l.replace(/^-\s*\[[ x]\]\s*/, '');
          return `<li data-type="taskItem" data-checked="false"><p>${text}</p></li>`;
        });
      
      if (taskItems.length > 0) {
        editor.insertContentAtCursor(`<ul data-type="taskList">${taskItems.join('')}</ul>`);
      } else {
        editor.insertTextAtCursor(content + " ");
      }
    } else {
      editor.insertTextAtCursor(content + " ");
    }
  }, []);

  const {
    isRecording,
    isConnecting,
    isProcessing,
    startRecording,
    stopRecording,
    recordingDuration,
    currentVolume,
    smartResult,
    showIntentModal,
    selectIntent,
    closeModal,
  } = useSmartSpeechToText({
    workspaceSlug: workspaceSlug || "",
    onIntentSelect: insertContent,
    silenceThreshold: 5000,
  });

  const speechHandler = {
    onStart: (nodeInfo?: { from: number; to: number }) => {
      setCurrentNodeInfo(nodeInfo || null);
      startRecording();
    },
    onStop: () => {
      stopRecording();
      setCurrentNodeInfo(null);
    },
    isRecording: () => isRecording,
  };

  const handleAISelectionAction = useCallback(
    async (payload: TAIActionPayload): Promise<string | null> => {
      if (!workspaceSlug) return null;
      try {
        const aiService = new AIService();
        let prompt = "";
        switch (payload.task) {
          case AI_EDITOR_TASKS.PARAPHRASE:
            prompt = `Paraphrase le texte suivant:\n\n${payload.text}`;
            break;
          case AI_EDITOR_TASKS.SIMPLIFY:
            prompt = `Simplifie le texte suivant:\n\n${payload.text}`;
            break;
          case AI_EDITOR_TASKS.EXPAND:
            prompt = `Développe le texte suivant:\n\n${payload.text}`;
            break;
          case AI_EDITOR_TASKS.SUMMARIZE:
            prompt = `Résume le texte suivant:\n\n${payload.text}`;
            break;
          case AI_EDITOR_TASKS.GENERATE_TITLE:
            prompt = `Génère un titre pour:\n\n${payload.text}`;
            break;
          case AI_EDITOR_TASKS.ASK_ANYTHING:
            prompt = payload.prompt ? `${payload.prompt}\n\n${payload.text}` : payload.text;
            break;
          default:
            prompt = payload.text;
        }
        const result = await aiService.createGptTask(workspaceSlug, { prompt, task: payload.task });
        return result?.response || null;
      } catch {
        return null;
      }
    },
    [workspaceSlug]
  );

  const handleRef = useCallback(
    (editorRef: EditorRefApi | null) => {
      editorRefInternal.current = editorRef;
      if (typeof ref === "function") ref(editorRef);
      else if (ref) ref.current = editorRef;
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
          getMentionedEntityDetails: (id) => ({ display_name: getUserDetails(id)?.display_name ?? "" }),
        }}
        extendedEditorProps={{}}
        aiHandler={{ onSelectionAction: handleAISelectionAction }}
        speechHandler={editable ? speechHandler : undefined}
        {...rest}
        containerClassName={cn("relative pl-3 pb-3", containerClassName)}
      />

      <RecordingIndicator
        isRecording={isRecording}
        volume={currentVolume}
        duration={recordingDuration}
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50"
      />

      {isProcessing && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 bg-custom-primary-100/10 rounded-lg border border-custom-primary-100/20">
          <Loader2 className="w-4 h-4 animate-spin text-custom-primary-100" />
          <span className="text-sm text-custom-primary-100">Analyse en cours...</span>
        </div>
      )}

      <IntentConfirmationModal
        isOpen={showIntentModal}
        onClose={closeModal}
        onConfirm={selectIntent}
        primaryIntent={smartResult?.intent || "note"}
        secondaryIntent={smartResult?.secondary_intent}
        preview={smartResult?.formatted_content || ""}
        originalTranscript={smartResult?.original_transcript}
        formattedTodo={smartResult?.formatted_todo}
        formattedNote={smartResult?.formatted_note}
        formattedPlanning={smartResult?.formatted_planning}
        formattedLongText={smartResult?.formatted_long_text}
      />
    </>
  );
});

RichTextEditor.displayName = "RichTextEditor";
