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
    
    console.log("[RichTextEditor] Inserting content:", { content, intent });
    
    if (intent === "todo") {
      const lines = content.split('\n').filter(l => l.trim());
      const taskItems: string[] = [];
      
      for (const line of lines) {
        const text = line.replace(/^-\s*\[[ x]\]\s*/, '').replace(/^[-•]\s*/, '').trim();
        if (text) {
          taskItems.push(`<li data-type="taskItem" data-checked="false"><p>${text}</p></li>`);
        }
      }
      
      if (taskItems.length > 0) {
        const html = `
          <div data-block-type="callout-component" data-logo-in-use="emoji" data-emoji-unicode="9989" data-emoji-url="https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/2705.png" data-background="rgba(34, 197, 94, 0.1)">
            <p><strong>✅ Tâches à faire</strong></p>
          </div>
          <ul data-type="taskList">${taskItems.join('')}</ul>
        `;
        editor.insertContentAtCursor(html);
      } else {
        editor.insertTextAtCursor(content + " ");
      }
    } else if (intent === "note") {
      const cleanContent = content.replace(/^[📝💡]\s*/, '').trim();
      const html = `
        <div data-block-type="callout-component" data-logo-in-use="emoji" data-emoji-unicode="128221" data-emoji-url="https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f4dd.png" data-background="rgba(59, 130, 246, 0.1)">
          <p><strong>📝 Note</strong></p>
          <p>${cleanContent}</p>
        </div>
      `;
      editor.insertContentAtCursor(html);
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
        const html = `
          <div data-block-type="callout-component" data-logo-in-use="emoji" data-emoji-unicode="128197" data-emoji-url="https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f4c5.png" data-background="rgba(168, 85, 247, 0.1)">
            <p><strong>📅 Planning</strong></p>
          </div>
          <ul data-type="taskList">${planItems.join('')}</ul>
        `;
        editor.insertContentAtCursor(html);
      } else {
        editor.insertTextAtCursor(content + " ");
      }
    } else if (intent === "long_text") {
      let htmlContent = content;
      
      htmlContent = htmlContent
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^#### (.+)$/gm, '<h4>$1</h4>');
      
      htmlContent = htmlContent.replace(/^>\s*(.+)$/gm, '<blockquote><p>$1</p></blockquote>');
      
      htmlContent = htmlContent.replace(/^[-•]\s+(.+)$/gm, '<li><p>$1</p></li>');
      htmlContent = htmlContent.replace(/(<li><p>.+<\/p><\/li>\n?)+/g, '<ul>$&</ul>');
      
      htmlContent = htmlContent.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      htmlContent = htmlContent.replace(/\*(.+?)\*/g, '<em>$1</em>');
      
      htmlContent = htmlContent.replace(/^---$/gm, '<hr/>');
      
      const paragraphs = htmlContent.split('\n\n').filter(p => p.trim());
      htmlContent = paragraphs.map(p => {
        if (p.startsWith('<h') || p.startsWith('<blockquote') || p.startsWith('<ul') || p.startsWith('<hr')) {
          return p;
        }
        return `<p>${p.replace(/\n/g, '<br/>')}</p>`;
      }).join('');
      
      const html = `
        <div data-block-type="callout-component" data-logo-in-use="emoji" data-emoji-unicode="128196" data-emoji-url="https://cdn.jsdelivr.net/npm/emoji-datasource-apple/img/apple/64/1f4c4.png" data-background="rgba(251, 191, 36, 0.1)">
          <p><strong>📄 Document</strong></p>
        </div>
        ${htmlContent}
      `;
      editor.insertContentAtCursor(html);
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
