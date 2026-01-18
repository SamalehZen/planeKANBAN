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
import { useTranslation } from "@plane/i18n";
import type { TSearchEntityRequestPayload, TSearchResponse, TWebhookConnectionQueryParams } from "@plane/types";
import { ERowVariant, Row, VoiceAssistantModal } from "@plane/ui";
import { cn, generateRandomColor, hslToHex } from "@plane/utils";
import { EditorMentionsRoot } from "@/components/editor/embeds/mentions";
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

  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [currentNodeInfo, setCurrentNodeInfo] = useState<{ from: number; to: number } | null>(null);

  const handleVoiceResult = useCallback(
    (text: string) => {
      console.log('[PageEditor] handleVoiceResult called with:', text);
      const editor = editorForwardRef?.current || editorRef?.current;
      console.log('[PageEditor] editor ref:', !!editor);
      
      if (!editor) {
        console.error("[PageEditor] No editor ref available");
        return;
      }

      try {
        if (currentNodeInfo && currentNodeInfo.from !== currentNodeInfo.to) {
          console.log('[PageEditor] Replacing node at:', currentNodeInfo);
          const view = (editor as any).editor?.view;
          if (view) {
            const { state, dispatch } = view;
            const tr = state.tr.insertText(text, currentNodeInfo.from, currentNodeInfo.to);
            dispatch(tr);
            console.log('[PageEditor] Node replaced successfully');
          } else {
            console.log('[PageEditor] No view, falling back to insertTextAtCursor');
            editor.insertTextAtCursor(text + " ");
          }
        } else {
          console.log('[PageEditor] Inserting at cursor');
          editor.insertTextAtCursor(text + " ");
          console.log('[PageEditor] Text inserted successfully');
        }
      } catch (e) {
        console.error('[PageEditor] Error, trying fallback:', e);
        try {
          editor.insertTextAtCursor(text + " ");
          console.log('[PageEditor] Fallback insert successful');
        } catch (e2) {
          console.error('[PageEditor] Fallback also failed:', e2);
        }
      }
      setCurrentNodeInfo(null);
    },
    [editorRef, editorForwardRef, currentNodeInfo]
  );

  const speechHandler = useMemo(
    () => ({
      onStart: (nodeInfo?: { from: number; to: number }) => {
        setCurrentNodeInfo(nodeInfo || null);
        setIsVoiceModalOpen(true);
      },
      onStop: () => {
        setIsVoiceModalOpen(false);
        setCurrentNodeInfo(null);
      },
      isRecording: () => isVoiceModalOpen,
    }),
    [isVoiceModalOpen]
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
