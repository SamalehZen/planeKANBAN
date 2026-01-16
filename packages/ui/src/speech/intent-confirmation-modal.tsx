import { useState, useEffect, useMemo } from "react";
import { 
  ListTodo, 
  FileText, 
  Calendar, 
  AlignLeft, 
  Check, 
  X, 
  Sparkles,
  Mic
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
  formattedTodo?: string;
  formattedNote?: string;
  formattedPlanning?: string;
  formattedLongText?: string;
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
    description: "Checklist avec cases à cocher",
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  },
  note: {
    icon: FileText,
    label: "Note simple",
    description: "Texte structuré simple",
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
    description: "Texte long avec titres",
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
  formattedTodo,
  formattedNote,
  formattedPlanning,
  formattedLongText,
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

  const currentPreview = useMemo(() => {
    switch (selectedIntent) {
      case "todo":
        return formattedTodo || preview;
      case "note":
        return formattedNote || preview;
      case "planning":
        return formattedPlanning || preview;
      case "long_text":
        return formattedLongText || preview;
      default:
        return preview;
    }
  }, [selectedIntent, preview, formattedTodo, formattedNote, formattedPlanning, formattedLongText]);

  if (!isOpen) return null;

  const allIntents: IntentType[] = ["todo", "note", "planning", "long_text"];
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
                    Choisissez le format
                  </h3>
                  <p className="text-sm text-custom-text-300 mt-0.5">
                    L'aperçu change selon votre choix
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-custom-background-80 transition-colors">
                <X className="w-5 h-5 text-custom-text-400" />
              </button>
            </div>
          </div>
        </div>

        <div className="px-6 py-4">
          {originalTranscript && (
            <div className="mb-4 p-3 rounded-lg bg-custom-background-90 border border-custom-border-200">
              <div className="flex items-center gap-2 mb-2">
                <Mic className="w-3.5 h-3.5 text-custom-text-400" />
                <span className="text-xs font-medium text-custom-text-400 uppercase tracking-wide">
                  Transcription
                </span>
              </div>
              <p className="text-sm text-custom-text-200">"{originalTranscript}"</p>
            </div>
          )}

          <div className="mb-4">
            <div className="grid grid-cols-4 gap-2">
              {allIntents.map((intent) => {
                const config = INTENT_CONFIG[intent];
                const Icon = config.icon;
                const isSelected = selectedIntent === intent;
                const isPrimary = intent === primaryIntent;
                
                return (
                  <button
                    key={intent}
                    onClick={() => setSelectedIntent(intent)}
                    className={cn(
                      "relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-200",
                      isSelected 
                        ? `${config.borderColor} ${config.bgColor}` 
                        : "border-custom-border-200 hover:border-custom-border-300"
                    )}
                  >
                    {isPrimary && (
                      <span className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-custom-primary-100 rounded-full" />
                    )}
                    <Icon className={cn("w-5 h-5", isSelected ? config.color : "text-custom-text-300")} />
                    <span className={cn(
                      "text-xs font-medium text-center",
                      isSelected ? "text-custom-text-100" : "text-custom-text-300"
                    )}>
                      {config.label}
                    </span>
                    {isSelected && <Check className={cn("w-4 h-4 absolute top-1 right-1", config.color)} />}
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
              <pre className="text-sm text-custom-text-200 whitespace-pre-wrap font-sans">
                {currentPreview}
              </pre>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-custom-border-200 bg-custom-background-90">
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-custom-text-200 hover:bg-custom-background-80 rounded-lg"
            >
              Annuler
            </button>
            <button
              onClick={() => onConfirm(selectedIntent)}
              className={cn(
                "px-5 py-2.5 text-sm font-medium text-white rounded-lg transition-all",
                "bg-custom-primary-100 hover:bg-custom-primary-200"
              )}
            >
              Insérer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

IntentConfirmationModal.displayName = "IntentConfirmationModal";
