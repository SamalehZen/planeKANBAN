export enum AI_EDITOR_TASKS {
  ASK_ANYTHING = "ASK_ANYTHING",
  PARAPHRASE = "PARAPHRASE",
  SIMPLIFY = "SIMPLIFY",
  EXPAND = "EXPAND",
  SUMMARIZE = "SUMMARIZE",
  GENERATE_TITLE = "GENERATE_TITLE",
}

export const AI_TASK_LABELS: Record<AI_EDITOR_TASKS, string> = {
  [AI_EDITOR_TASKS.ASK_ANYTHING]: "Ask Pi",
  [AI_EDITOR_TASKS.PARAPHRASE]: "Paraphraser",
  [AI_EDITOR_TASKS.SIMPLIFY]: "Simplifier",
  [AI_EDITOR_TASKS.EXPAND]: "Développer",
  [AI_EDITOR_TASKS.SUMMARIZE]: "Résumer",
  [AI_EDITOR_TASKS.GENERATE_TITLE]: "Générer un titre",
};

export const AI_TASK_LOADING_TEXTS: Record<AI_EDITOR_TASKS, string> = {
  [AI_EDITOR_TASKS.ASK_ANYTHING]: "Pi is generating response",
  [AI_EDITOR_TASKS.PARAPHRASE]: "Pi is paraphrasing",
  [AI_EDITOR_TASKS.SIMPLIFY]: "Pi is simplifying",
  [AI_EDITOR_TASKS.EXPAND]: "Pi is expanding",
  [AI_EDITOR_TASKS.SUMMARIZE]: "Pi is summarizing",
  [AI_EDITOR_TASKS.GENERATE_TITLE]: "Pi is generating title",
};
