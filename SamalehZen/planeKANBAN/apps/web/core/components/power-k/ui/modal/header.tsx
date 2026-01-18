import React, { useCallback, useState, useEffect } from "react";
import { Command } from "cmdk";
import { X, Search, Mic, MicOff, Loader2 } from "lucide-react";
// plane imports
import { useSpeechToText } from "@plane/hooks";
import { useTranslation } from "@plane/i18n";
import { Tooltip } from "@plane/propel/tooltip";
import { cn } from "@plane/utils";
// local imports
import type { TPowerKContext, TPowerKPageType } from "../../core/types";
import { POWER_K_MODAL_PAGE_DETAILS } from "./constants";
import { PowerKModalContextIndicator } from "./context-indicator";

type Props = {
  activePage: TPowerKPageType | null;
  context: TPowerKContext;
  onSearchChange: (value: string) => void;
  searchTerm: string;
  workspaceSlug?: string;
};

export function PowerKModalHeader(props: Props) {
  const { context, searchTerm, onSearchChange, activePage, workspaceSlug } = props;
  // translation
  const { t } = useTranslation();

  // Speech-to-text integration
  const handleSpeechTranscript = useCallback(
    (text: string, isFinal: boolean) => {
      if (isFinal) {
        onSearchChange(searchTerm + text);
      }
    },
    [onSearchChange, searchTerm]
  );

  const {
    isRecording,
    isConnecting,
    startRecording,
    stopRecording,
  } = useSpeechToText({
    workspaceSlug: workspaceSlug || "",
    onTranscript: handleSpeechTranscript,
  });

  const handleMicClick = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const isSpeechAvailable = !!workspaceSlug;
  // derived values
  const placeholder = activePage
    ? t(POWER_K_MODAL_PAGE_DETAILS[activePage].i18n_placeholder)
    : t("power_k.page_placeholders.default");

  return (
    <div className="border-b border-subtle">
      {/* Context Indicator */}
      {context.shouldShowContextBasedActions && !activePage && (
        <PowerKModalContextIndicator
          activeContext={context.activeContext}
          handleClearContext={() => context.setShouldShowContextBasedActions(false)}
        />
      )}

      {/* Search Input */}
      <div className="flex items-center gap-2 px-4 py-3">
        <Search className="shrink-0 size-4 text-placeholder" />
        <Command.Input
          value={searchTerm}
          onValueChange={onSearchChange}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-13 text-primary placeholder-(--text-color-placeholder) outline-none"
          autoFocus
        />
        {searchTerm && (
          <button
            onClick={() => onSearchChange("")}
            className="flex-shrink-0 rounded-sm p-1 text-placeholder hover:bg-layer-1 hover:text-secondary"
          >
            <X className="h-3 w-3" />
          </button>
        )}
        {isSpeechAvailable && (
          <Tooltip
            tooltipContent={
              isConnecting
                ? "Connexion..."
                : isRecording
                  ? "Arrêter l'enregistrement"
                  : "Entrée vocale"
            }
          >
            <button
              type="button"
              onClick={handleMicClick}
              disabled={isConnecting}
              className={cn(
                "flex-shrink-0 rounded-sm p-1 transition-all",
                {
                  "bg-red-500 text-white animate-pulse": isRecording,
                  "text-placeholder hover:bg-layer-1 hover:text-secondary": !isRecording,
                  "opacity-50 cursor-not-allowed": isConnecting,
                }
              )}
            >
              {isConnecting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : isRecording ? (
                <MicOff className="h-3.5 w-3.5" />
              ) : (
                <Mic className="h-3.5 w-3.5" />
              )}
            </button>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
