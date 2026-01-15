export enum AI_EDITOR_TASKS {
  ASK_ANYTHING = "ASK_ANYTHING",
  PARAPHRASE = "PARAPHRASE",
  SIMPLIFY = "SIMPLIFY",
  EXPAND = "EXPAND",
  SUMMARIZE = "SUMMARIZE",
  GENERATE_TITLE = "GENERATE_TITLE",
}

export const LOADING_TEXTS: {
  [key in AI_EDITOR_TASKS]: string;
} = {
  [AI_EDITOR_TASKS.ASK_ANYTHING]: "Pi is generating response",
  [AI_EDITOR_TASKS.PARAPHRASE]: "Pi is paraphrasing",
  [AI_EDITOR_TASKS.SIMPLIFY]: "Pi is simplifying",
  [AI_EDITOR_TASKS.EXPAND]: "Pi is expanding",
  [AI_EDITOR_TASKS.SUMMARIZE]: "Pi is summarizing",
  [AI_EDITOR_TASKS.GENERATE_TITLE]: "Pi is generating title",
};
