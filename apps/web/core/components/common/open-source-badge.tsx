import { Github } from "lucide-react";

export function OpenSourceBadge() {
  return (
    <a
      href="https://github.com/SamalehZen/planeKANBAN"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
    >
      <Github className="h-3 w-3" />
      <span>Open Source (AGPL-3.0)</span>
    </a>
  );
}
