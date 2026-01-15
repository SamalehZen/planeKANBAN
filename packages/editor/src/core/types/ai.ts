import type { AI_EDITOR_TASKS } from "@plane/constants";

export type TAIMenuProps = {
  isOpen: boolean;
  onClose: () => void;
};

export type TAIActionPayload = {
  task: AI_EDITOR_TASKS;
  text: string;
  casual_score?: number;
  formal_score?: number;
  prompt?: string;
};

export type TAISelectionHandler = (payload: TAIActionPayload) => Promise<string | null>;

export type TAIHandler = {
  menu?: (props: TAIMenuProps) => React.ReactNode;
  onSelectionAction?: TAISelectionHandler;
};
