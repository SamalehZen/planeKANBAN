import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { observer } from "mobx-react";
import { LIVE_BASE_PATH, LIVE_BASE_URL } from "@plane/constants";
import { CollaborativeDocumentEditorWithRef } from "@plane/editor";
import type {
  CollaborationState,
  EditorRefApi,
  EditorTitleRefApi,
  TAIActionPayload,
  TAIMenuProps,
  TDisplayConfig,
  TFileHandler,
  TRealtimeConfig,
  TServerHandler,
} from "@plane/editor";
import { AI_EDITOR_TASKS } from "@plane/constants";
import { useIntentFirstSpeech } from "@plane/hooks";
import type { TIntentType } from "@plane/services";
import { useTranslation } from "@plane/i18n";
import type { TSearchEntityRequestPayload, TSearchResponse, TWebhookConnectionQueryParams } from "@plane/types";
import { ERowVariant, Row } from "@plane/ui";
import { cn, generateRandomColor, hslToHex } from "@plane/utils";
import { EditorMentionsRoot } from "@/components/editor/embeds/mentions";
import { VoiceAssistantOverlay } from "@/components/speech";
import { useEditorMention } from "@/hooks/editor";
import { useMember } from "@/hooks/store/use-member";
import { useWorkspace } from "@/hooks/store/use-workspace";
import { useUser } from "@/hooks/store/user";
import { usePageFilters } from "@/hooks/use-page-filters";
import { useParseEditorContent } from "@/hooks/use-parse-editor-content";
import type { TCustomEventHandlers } from "@/hooks/use-realtime-page-events";
import { useRealtimePageEvents } from "@/hooks/use-realtime-page-events";
import { EditorAIMenu } from "@/plane-web/components/pages";
import { AIService } from "@/services/ai.service";
import type { TExtendedEditorExtensionsConfig } from "@/plane-web/hooks/pages";
import type { EPageStoreType } from "@/plane-web/hooks/store";
import { useEditorFlagging } from "@/plane-web/hooks/use-editor-flagging";
import type { TPageInstance } from "@/store/pages/base-page";
import { PageContentLoader } from "../loaders/page-content-loader";
import { PageEditorHeaderRoot } from "./header";
import { PageContentBrowser } from "./summary";

export type TEditorBodyConfig = {
  fileHandler: TFileHandler;
};

export type TEditorBodyHandlers = {
  fetchEntity: (payload: TSearchEntityRequestPayload) => Promise<TSearchResponse>;
  getRedirectionLink: (pageId?: string) => string;
};

type Props = {
  config: TEditorBodyConfig;
  editorReady: boolean;
  editorForwardRef: React.RefObject<EditorRefApi>;
  handleEditorReady: (status: boolean) => void;
  handleOpenNavigationPane: () => void;
  handlers: TEditorBodyHandlers;
  isNavigationPaneOpen: boolean;
  page: TPageInstance;
  webhookConnectionParams: TWebhookConnectionQueryParams;
  projectId?: string;
  workspaceSlug: string;
  storeType: EPageStoreType;
  customRealtimeEventHandlers?: TCustomEventHandlers;
  extendedEditorProps: TExtendedEditorExtensionsConfig;
  isFetchingFallbackBinary?: boolean;
  onCollaborationStateChange?: (state: CollaborationState) => void;
};

export const PageEditorBody = observer(function PageEditorBody(props: Props) {
  const {
    config,
    editorForwardRef,
    handleEditorReady,
    handleOpenNavigationPane,
    handlers,
    isNavigationPaneOpen,
    page,
    storeType,
    webhookConnectionParams,
    projectId,
    workspaceSlug,
    extendedEditorProps,
    isFetchingFallbackBinary,
    onCollaborationStateChange,
  } = props;

  const titleEditorRef = useRef<EditorTitleRefApi>(null);
  const { data: currentUser } = useUser();
  const { getWorkspaceBySlug } = useWorkspace();
  const { getUserDetails } = useMember();

  const {
    id: pageId,
    isContentEditable,
    editor: { editorRef, updateAssetsList },
    setSyncingStatus,
  } = page;
  const workspaceId = getWorkspaceBySlug(workspaceSlug)?.id ?? "";

  const { fetchMentions } = useEditorMention({
    enableAdvancedMentions: true,
    searchEntity: handlers.fetchEntity,
  });

  const { document: documentEditorExtensions } = useEditorFlagging({
    workspaceSlug,
    projectId,
    storeType,
  });

  const { getEditorMetaData } = useParseEditorContent({
    projectId,
    workspaceSlug,
  });

  const { fontSize, fontStyle, isFullWidth } = usePageFilters();
  const { t } = useTranslation();

  const displayConfig: TDisplayConfig = useMemo(
    () => ({
      fontSize,
      fontStyle,
      wideLayout: isFullWidth,
    }),
    [fontSize, fontStyle, isFullWidth]
  );

  const { updatePageProperties } = useRealtimePageEvents({
    storeType,
    page,
    getUserDetails,
    handlers,
  });

  useEffect(() => {
    setSyncingStatus("syncing");
    onCollaborationStateChange?.({
      stage: { kind: "connecting" },
      isServerSynced: false,
      isServerDisconnected: false,
    });
  }, [pageId, setSyncingStatus, onCollaborationStateChange]);

  const [showVoiceOverlay, setShowVoiceOverlay] = useState(false);
  const [uiState, setUiState] = useState<"menu" | "listening" | "processing" | "result">("menu");

  const insertContent = useCallback((content: string, intent: TIntentType) => {
    const editor = editorForwardRef?.current || editorRef?.current;
    if (!editor || !content) return;
    
    console.log("[PageEditor] Inserting content:", { content, intent });
    
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
          <hr/>
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
          <hr/>
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
        <hr/>
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
  }, [editorForwardRef, editorRef]);

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

  const speechHandler = useMemo(
    () => ({
      onStart: () => {
        setShowVoiceOverlay(true);
        setUiState("menu");
      },
      onStop: () => {
        handleStop();
      },
      isRecording: () => speech.isRecording,
    }),
    [speech.isRecording, handleStop]
  );

  const getAIMenu = useCallback(
    ({ isOpen, onClose }: TAIMenuProps) => (
      <EditorAIMenu
        editorRef={editorRef}
        isOpen={isOpen}
        onClose={onClose}
        workspaceId={workspaceId}
        workspaceSlug={workspaceSlug}
      />
    ),
    [editorRef, workspaceId, workspaceSlug]
  );

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

  const serverHandler: TServerHandler = useMemo(
    () => ({
      onStateChange: (state) => {
        onCollaborationStateChange?.(state);

        if (state.stage.kind === "disconnected") {
          setSyncingStatus("error");
        } else if (state.stage.kind === "synced") {
          setSyncingStatus("synced");
        } else {
          setSyncingStatus("syncing");
        }
      },
    }),
    [setSyncingStatus, onCollaborationStateChange]
  );

  const realtimeConfig: TRealtimeConfig | undefined = useMemo(() => {
    try {
      const LIVE_SERVER_BASE_URL = LIVE_BASE_URL?.trim() || window.location.origin;
      const WS_LIVE_URL = new URL(LIVE_SERVER_BASE_URL);
      const isSecureEnvironment = window.location.protocol === "https:";
      WS_LIVE_URL.protocol = isSecureEnvironment ? "wss" : "ws";
      WS_LIVE_URL.pathname = `${LIVE_BASE_PATH}/collaboration`;

      Object.entries(webhookConnectionParams)
        .filter(([_, value]) => value !== undefined && value !== null)
        .forEach(([key, value]) => {
          WS_LIVE_URL.searchParams.set(key, String(value));
        });

      return {
        url: WS_LIVE_URL.toString(),
      };
    } catch (error) {
      console.error("Error creating realtime config", error);
      return undefined;
    }
  }, [webhookConnectionParams]);

  const userConfig = useMemo(
    () => ({
      id: currentUser?.id ?? "",
      name: currentUser?.display_name ?? "",
      color: hslToHex(generateRandomColor(currentUser?.id ?? "")),
    }),
    [currentUser?.display_name, currentUser?.id]
  );

  const blockWidthClassName = cn(
    "block bg-transparent w-full max-w-[720px] mx-auto transition-all duration-200 ease-in-out",
    {
      "max-w-[1152px]": isFullWidth,
    }
  );

  const isPageLoading = pageId === undefined || !realtimeConfig;

  if (isPageLoading) return <PageContentLoader className={blockWidthClassName} />;

  return (
    <>
      <Row
        className="relative size-full flex flex-col overflow-y-auto overflow-x-hidden vertical-scrollbar scrollbar-md duration-200"
        variant={ERowVariant.HUGGING}
      >
        <div id="page-content-container" className="relative w-full flex-shrink-0">
          {!isNavigationPaneOpen && (
            <div className="page-summary-container absolute h-full right-0 top-[64px] z-[5]">
              <div className="sticky top-[72px]">
                <div className="group/page-toc relative px-page-x">
                  <div
                    className="!cursor-pointer max-h-[50vh] overflow-hidden"
                    role="button"
                    aria-label={t("page_navigation_pane.outline_floating_button")}
                    onClick={handleOpenNavigationPane}
                  >
                    <PageContentBrowser className="overflow-y-auto" editorRef={editorRef} showOutline />
                  </div>
                  <div className="absolute top-0 right-0 opacity-0 translate-x-1/2 pointer-events-none group-hover/page-toc:opacity-100 group-hover/page-toc:-translate-x-1/4 group-hover/page-toc:pointer-events-auto transition-all duration-300 w-52 max-h-[70vh] overflow-y-scroll vertical-scrollbar scrollbar-sm whitespace-nowrap bg-surface-2 p-4 rounded-sm">
                    <PageContentBrowser className="overflow-y-auto" editorRef={editorRef} />
                  </div>
                </div>
              </div>
            </div>
          )}
          <div>
            <div className="page-header-container group/page-header">
              <div className={blockWidthClassName}>
                <PageEditorHeaderRoot page={page} projectId={projectId} />
              </div>
            </div>
            <CollaborativeDocumentEditorWithRef
              editable={isContentEditable}
              id={pageId}
              fileHandler={config.fileHandler}
              handleEditorReady={handleEditorReady}
              ref={editorForwardRef}
              titleRef={titleEditorRef}
              containerClassName="h-full p-0 pb-64"
              displayConfig={displayConfig}
              getEditorMetaData={getEditorMetaData}
              mentionHandler={{
                searchCallback: async (query) => {
                  const res = await fetchMentions(query);
                  if (!res) throw new Error("Failed in fetching mentions");
                  return res;
                },
                renderComponent: (props) => <EditorMentionsRoot {...props} />,
                getMentionedEntityDetails: (id: string) => ({ display_name: getUserDetails(id)?.display_name ?? "" }),
              }}
              updatePageProperties={updatePageProperties}
              realtimeConfig={realtimeConfig}
              serverHandler={serverHandler}
              user={userConfig}
              disabledExtensions={documentEditorExtensions.disabled}
              flaggedExtensions={documentEditorExtensions.flagged}
              aiHandler={{
                menu: getAIMenu,
                onSelectionAction: handleAISelectionAction,
              }}
              speechHandler={isContentEditable ? speechHandler : undefined}
              onAssetChange={updateAssetsList}
              extendedEditorProps={extendedEditorProps}
              isFetchingFallbackBinary={isFetchingFallbackBinary}
            />
          </div>
        </div>
      </Row>

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
