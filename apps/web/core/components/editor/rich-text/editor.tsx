import { forwardRef, useCallback, useState, useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { AI_EDITOR_TASKS } from "@plane/constants";
import { RichTextEditorWithRef } from "@plane/editor";
import type { EditorRefApi, IRichTextEditorProps, TAIActionPayload, TFileHandler } from "@plane/editor";
import { useSpeechToText } from "@plane/hooks";
import { SpeechService } from "@plane/services";
import type { MakeOptional, TSearchEntityRequestPayload, TSearchResponse } from "@plane/types";
import { RecordingIndicator, IntentConfirmationModal } from "@plane/ui";
import { cn } from "@plane/utils";
import { EditorMentionsRoot } from "@/components/editor/embeds/mentions";
import { useEditorConfig, useEditorMention } from "@/hooks/editor";
import { useMember } from "@/hooks/store/use-member";
import { useParseEditorContent } from "@/hooks/use-parse-editor-content";
import { useEditorFlagging } from "@/plane-web/hooks/use-editor-flagging";
import { AIService } from "@/services/ai.service";

type IntentType = "todo" | "note" | "planning" | "long_text";

interface ISmartTranscriptResponse {
  intent: IntentType;
  confidence: number;
  secondary_intent?: IntentType;
  formatted_content: string;
  original_transcript: string;
  corrections?: string[];
}

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
  const [isRecordingState, setIsRecordingState] = useState(false);
  const [currentNodeInfo, setCurrentNodeInfo] = useState<{ from: number; to: number } | null>(null);
  const streamingTextRef = useRef<string>("");
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentVolume, setCurrentVolume] = useState(0);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showIntentModal, setShowIntentModal] = useState(false);
  const [smartResult, setSmartResult] = useState<ISmartTranscriptResponse | null>(null);

  const insertStructuredContent = useCallback(
    (intent: IntentType, content: string) => {
      const editor = editorRefInternal.current;
      if (!editor) return;

      switch (intent) {
        case "todo":
        case "planning": {
          const lines = content.split("\n").filter(l => l.trim());
          const formattedContent = lines
            .map(line => {
              const taskMatch = line.match(/^-\s*\[[ x]\]\s*(.*)$/);
              if (taskMatch) {
                return `<li data-type="taskItem" data-checked="false"><p>${taskMatch[1]}</p></li>`;
              }
              return `<p>${line}</p>`;
            })
            .join("");
          
          if (lines.some(l => l.match(/^-\s*\[[ x]\]/))) {
            editor.insertContentAtCursor(`<ul data-type="taskList">${formattedContent}</ul>`);
          } else {
            editor.insertContentAtCursor(content);
          }
          break;
        }
        case "note":
        case "long_text":
        default:
          editor.insertContentAtCursor(content);
          break;
      }
    },
    []
  );

  const handleSpeechTranscript = useCallback(
    async (text: string, isFinal: boolean) => {
      if (!editorRefInternal.current) return;
      
      const editor = editorRefInternal.current;
      
      if (!isFinal) {
        if (currentNodeInfo) {
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
        return;
      }

      if (!text.trim()) return;
      
      setIsProcessing(true);
      
      try {
        const speechService = new SpeechService();
        const result = await speechService.processSmartTranscript(workspaceSlug, {
          transcript: text,
          language: "fr",
        });
        
        setSmartResult(result);
        
        if (result.secondary_intent) {
          setShowIntentModal(true);
        } else {
          insertStructuredContent(result.intent, result.formatted_content);
        }
      } catch (error) {
        console.error("Smart transcript failed:", error);
        editor.insertTextAtCursor(text + " ");
      } finally {
        setIsProcessing(false);
        streamingTextRef.current = "";
      }
    },
    [workspaceSlug, currentNodeInfo, insertStructuredContent]
  );

  const handleIntentConfirm = useCallback(
    (selectedIntent: IntentType) => {
      if (smartResult) {
        insertStructuredContent(selectedIntent, smartResult.formatted_content);
      }
      setShowIntentModal(false);
      setSmartResult(null);
    },
    [smartResult, insertStructuredContent]
  );

  const {
    isRecording,
    startRecording,
    stopRecording,
    recordingDuration: hookDuration,
    currentVolume: hookVolume,
  } = useSpeechToText({
    workspaceSlug: workspaceSlug || "",
    onTranscript: handleSpeechTranscript,
    silenceThreshold: 5000,
    onVolumeChange: setCurrentVolume,
    onRecordingTime: setRecordingDuration,
  });

  useEffect(() => {
    setIsRecordingState(isRecording);
    if (!isRecording) {
      setCurrentVolume(0);
      setRecordingDuration(0);
    }
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

      <RecordingIndicator
        isRecording={isRecordingState}
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
        onClose={() => {
          setShowIntentModal(false);
          if (smartResult) {
            editorRefInternal.current?.insertTextAtCursor(smartResult.original_transcript + " ");
          }
          setSmartResult(null);
        }}
        onConfirm={handleIntentConfirm}
        primaryIntent={smartResult?.intent || "note"}
        secondaryIntent={smartResult?.secondary_intent}
        preview={smartResult?.formatted_content || ""}
      />
    </>
  );
});

RichTextEditor.displayName = "RichTextEditor";
