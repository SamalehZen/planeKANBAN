import { useState, useEffect } from "react";
import { 
  ListTodo, 
  FileText, 
  Calendar, 
  AlignLeft, 
  Check, 
  X, 
  Sparkles,
  Mic,
  ChevronRight
} from "lucide-react";
import { cn } from "../utils";

type IntentType = "todo" | "note" | "planning" | "long_text";

interface IntentConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedIntent: IntentType) => void;
  primaryIntent: IntentType;
  secondaryIntent?: IntentType;
  preview: string;
  originalTranscript?: string;
}

const INTENT_CONFIG: Record<IntentType, { 
  icon: typeof ListTodo; 
  label: string; 
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  todo: {
    icon: ListTodo,
    label: "Liste de tâches",
    description: "Créer une checklist avec des cases à cocher",
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  },
  note: {
    icon: FileText,
    label: "Note simple",
    description: "Texte structuré et formaté",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  planning: {
    icon: Calendar,
    label: "Planning",
    description: "Tâches avec dates et priorités",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
  },
  long_text: {
    icon: AlignLeft,
    label: "Document",
    description: "Texte long avec titres et sections",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
  },
};

export const IntentConfirmationModal: React.FC<IntentConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  primaryIntent,
  secondaryIntent,
  preview,
  originalTranscript,
}) => {
  const [selectedIntent, setSelectedIntent] = useState<IntentType>(primaryIntent);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedIntent(primaryIntent);
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, primaryIntent]);

  if (!isOpen) return null;

  const intentsToShow = secondaryIntent 
    ? [primaryIntent, secondaryIntent] 
    : Object.keys(INTENT_CONFIG) as IntentType[];

  const selectedConfig = INTENT_CONFIG[selectedIntent];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-custom-backdrop transition-opacity duration-200"
        onClick={onClose}
      />
      
      <div className={cn(
        "relative bg-custom-background-100 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden",
        "transform transition-all duration-300",
        isAnimating ? "scale-95 opacity-0" : "scale-100 opacity-100"
      )}>
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-custom-primary-100/10 via-transparent to-custom-primary-200/5" />
          <div className="relative px-6 py-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-custom-primary-100/10">
                  <Sparkles className="w-5 h-5 text-custom-primary-100" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-custom-text-100">
                    Analyse vocale terminée
                  </h3>
                  <p className="text-sm text-custom-text-300 mt-0.5">
                    Choisissez le format qui correspond le mieux
                  </p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="p-2 rounded-lg hover:bg-custom-background-80 transition-colors group"
              >
                <X className="w-5 h-5 text-custom-text-400 group-hover:text-custom-text-200" />
              </button>
            </div>
          </div>
        </div>

        <div className="px-6 py-4">
          {originalTranscript && (
            <div className="mb-5 p-3 rounded-lg bg-custom-background-90 border border-custom-border-200">
              <div className="flex items-center gap-2 mb-2">
                <Mic className="w-3.5 h-3.5 text-custom-text-400" />
                <span className="text-xs font-medium text-custom-text-400 uppercase tracking-wide">
                  Transcription originale
                </span>
              </div>
              <p className="text-sm text-custom-text-200 leading-relaxed">
                "{originalTranscript}"
              </p>
            </div>
          )}

          <div className="mb-5">
            <label className="block text-sm font-medium text-custom-text-200 mb-3">
              Format de sortie
            </label>
            <div className="grid grid-cols-2 gap-3">
              {intentsToShow.map((intent) => {
                const config = INTENT_CONFIG[intent];
                const Icon = config.icon;
                const isSelected = selectedIntent === intent;
                const isPrimary = intent === primaryIntent;
                
                return (
                  <button
                    key={intent}
                    onClick={() => setSelectedIntent(intent)}
                    className={cn(
                      "relative flex items-start gap-3 p-4 rounded-xl border-2 transition-all duration-200 text-left group",
                      isSelected 
                        ? `${config.borderColor} ${config.bgColor}` 
                        : "border-custom-border-200 hover:border-custom-border-300 hover:bg-custom-background-90"
                    )}
                  >
                    {isPrimary && (
                      <span className="absolute -top-2 -right-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-custom-primary-100 text-white rounded-full shadow-sm">
                        Suggéré
                      </span>
                    )}
                    <div className={cn(
                      "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                      isSelected ? config.bgColor : "bg-custom-background-80 group-hover:bg-custom-background-90"
                    )}>
                      <Icon className={cn(
                        "w-5 h-5 transition-colors",
                        isSelected ? config.color : "text-custom-text-300"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "font-medium transition-colors",
                          isSelected ? "text-custom-text-100" : "text-custom-text-200"
                        )}>
                          {config.label}
                        </span>
                        {isSelected && (
                          <Check className={cn("w-4 h-4", config.color)} />
                        )}
                      </div>
                      <p className="text-xs text-custom-text-400 mt-0.5 line-clamp-2">
                        {config.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-custom-border-200 overflow-hidden">
            <div className={cn(
              "px-4 py-2.5 border-b flex items-center gap-2",
              selectedConfig.bgColor,
              selectedConfig.borderColor
            )}>
              <selectedConfig.icon className={cn("w-4 h-4", selectedConfig.color)} />
              <span className={cn("text-sm font-medium", selectedConfig.color)}>
                Aperçu: {selectedConfig.label}
              </span>
            </div>
            <div className="p-4 bg-custom-background-100 max-h-48 overflow-y-auto">
              <div 
                className="text-sm text-custom-text-200 prose prose-sm max-w-none
                  prose-headings:text-custom-text-100 prose-headings:font-semibold
                  prose-p:text-custom-text-200 prose-p:leading-relaxed
                  prose-ul:text-custom-text-200 prose-li:text-custom-text-200
                  prose-strong:text-custom-text-100"
                dangerouslySetInnerHTML={{ 
                  __html: preview
                    .replace(/\n/g, "<br/>")
                    .replace(/^- \[ \] (.+)$/gm, '<div class="flex items-center gap-2 py-1"><input type="checkbox" disabled class="rounded border-custom-border-300" /><span>$1</span></div>')
                    .replace(/^## (.+)$/gm, '<h2 class="text-base font-semibold mt-3 mb-2">$1</h2>')
                    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-medium mt-2 mb-1">$1</h3>')
                }}
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-custom-border-200 bg-custom-background-90">
          <div className="flex items-center justify-between">
            <p className="text-xs text-custom-text-400">
              Le contenu sera inséré dans la description
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2.5 text-sm font-medium text-custom-text-200 hover:text-custom-text-100 hover:bg-custom-background-80 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => onConfirm(selectedIntent)}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white rounded-lg transition-all",
                  "bg-custom-primary-100 hover:bg-custom-primary-200",
                  "shadow-sm hover:shadow-md"
                )}
              >
                Insérer
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

IntentConfirmationModal.displayName = "IntentConfirmationModal";
