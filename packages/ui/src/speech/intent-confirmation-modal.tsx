import { useState } from "react";
import { ListTodo, FileText, Calendar, AlignLeft, Check, X } from "lucide-react";
import { cn } from "../utils";

type IntentType = "todo" | "note" | "planning" | "long_text";

interface IntentConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedIntent: IntentType) => void;
  primaryIntent: IntentType;
  secondaryIntent?: IntentType;
  preview: string;
}

const INTENT_CONFIG: Record<IntentType, { icon: typeof ListTodo; label: string; description: string }> = {
  todo: {
    icon: ListTodo,
    label: "Liste de tâches",
    description: "Checklist avec cases à cocher",
  },
  note: {
    icon: FileText,
    label: "Note",
    description: "Texte structuré simple",
  },
  planning: {
    icon: Calendar,
    label: "Planning",
    description: "Tâches avec dates et priorités",
  },
  long_text: {
    icon: AlignLeft,
    label: "Texte long",
    description: "Document avec titres et paragraphes",
  },
};

export const IntentConfirmationModal: React.FC<IntentConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  primaryIntent,
  secondaryIntent,
  preview,
}) => {
  const [selectedIntent, setSelectedIntent] = useState<IntentType>(primaryIntent);

  if (!isOpen) return null;

  const intentsToShow = secondaryIntent 
    ? [primaryIntent, secondaryIntent] 
    : [primaryIntent];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-custom-background-100 rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-custom-border-200">
          <h3 className="text-lg font-semibold text-custom-text-100">Confirmer le format</h3>
          <button onClick={onClose} className="p-1 hover:bg-custom-background-80 rounded">
            <X className="w-5 h-5 text-custom-text-300" />
          </button>
        </div>
        <div className="p-6">
          <p className="text-sm text-custom-text-200 mb-4">
            L'IA a détecté plusieurs intentions possibles. Choisissez le format souhaité:
          </p>
          <div className="space-y-2 mb-6">
            {intentsToShow.map((intent) => {
              const config = INTENT_CONFIG[intent];
              const Icon = config.icon;
              const isSelected = selectedIntent === intent;
              return (
                <button
                  key={intent}
                  onClick={() => setSelectedIntent(intent)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all",
                    isSelected 
                      ? "border-custom-primary-100 bg-custom-primary-100/10" 
                      : "border-custom-border-200 hover:border-custom-border-300"
                  )}
                >
                  <Icon className={cn("w-5 h-5", isSelected ? "text-custom-primary-100" : "text-custom-text-300")} />
                  <div className="text-left flex-1">
                    <div className="font-medium text-custom-text-100">{config.label}</div>
                    <div className="text-sm text-custom-text-300">{config.description}</div>
                  </div>
                  {isSelected && <Check className="w-5 h-5 text-custom-primary-100" />}
                </button>
              );
            })}
          </div>
          <div className="bg-custom-background-80 rounded-lg p-4 max-h-40 overflow-y-auto">
            <div className="text-xs text-custom-text-300 mb-2">Aperçu:</div>
            <div 
              className="text-sm prose prose-sm max-w-none text-custom-text-200"
              dangerouslySetInnerHTML={{ __html: preview.replace(/\n/g, "<br/>") }}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-custom-border-200 bg-custom-background-90">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-custom-text-200 hover:bg-custom-background-80 rounded-lg"
          >
            Annuler
          </button>
          <button
            onClick={() => onConfirm(selectedIntent)}
            className="px-4 py-2 text-sm font-medium text-white bg-custom-primary-100 hover:bg-custom-primary-200 rounded-lg"
          >
            Insérer
          </button>
        </div>
      </div>
    </div>
  );
};

IntentConfirmationModal.displayName = "IntentConfirmationModal";
