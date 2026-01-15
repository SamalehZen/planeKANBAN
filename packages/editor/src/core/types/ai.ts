import type { AI_EDITOR_TASKS } from "@plane/constants";

export type TAIMenuProps = {
  isOpen: boolean;
  onClose: () => void;
};

export type TAISelectionHandler = (
  task: AI_EDITOR_TASKS,
  selectedText: string
) => Promise<string | null>;

export type TAIHandler = {
  menu?: (props: TAIMenuProps) => React.ReactNode;
  onSelectionAction?: TAISelectionHandler;
};
