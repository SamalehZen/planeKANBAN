import { forwardRef, useCallback, useState, useRef, useEffect } from "react";
import { AI_EDITOR_TASKS } from "@plane/constants";
import { RichTextEditorWithRef } from "@plane/editor";
import type { EditorRefApi, IRichTextEditorProps, TAIActionPayload, TFileHandler } from "@plane/editor";
import { useIntentFirstSpeech } from "@plane/hooks";
import type { TIntentType } from "@plane/services";
import type { MakeOptional, TSearchEntityRequestPayload, TSearchResponse } from "@plane/types";
import { cn } from "@plane/utils";
import { EditorMentionsRoot } from "@/components/editor/embeds/mentions";
import { VoiceAssistantOverlay } from "@/components/speech";
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
  const [showVoiceOverlay, setShowVoiceOverlay] = useState(false);
  const [uiState, setUiState] = useState<"menu" | "listening" | "processing" | "result">("menu");

  const insertContent = useCallback((content: string, intent: TIntentType) => {
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

    setUiState("result");
    setTimeout(() => {
      setShowVoiceOverlay(false);
      setUiState("menu");
    }, 1500);
  }, []);

  const speech = useIntentFirstSpeech({
    workspaceSlug: workspaceSlug || "",
    onResult: insertContent,
  });

  useEffect(() => {
    if (speech.isRecording) {
      setUiState("listening");
    } else if (speech.isProcessing) {
      setUiState("processing");
    }
  }, [speech.isRecording, speech.isProcessing]);

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

  const speechHandler = {
    onStart: () => {
      setShowVoiceOverlay(true);
      setUiState("menu");
    },
    onStop: () => {
      handleStop();
    },
    isRecording: () => speech.isRecording,
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
});

RichTextEditor.displayName = "RichTextEditor";
