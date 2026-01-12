import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createRoot } from "react-dom/client"; // This import is not used here but in index.tsx in the demo. Removing.

export type Theme = "light" | "dark" | "system";

interface VisualThemeStore {
  theme: Theme;
  setTheme: (theme: Theme, coordinates?: { x: number; y: number }) => void;
}

export const useVisualThemeStore = create<VisualThemeStore>()(
  persist(
    (set) => ({
      theme: "system",
      setTheme: (theme: Theme, coordinates?: { x: number; y: number }) => {
        if (typeof document !== "undefined") {
            if (coordinates) {
            document.documentElement.style.setProperty("--x", `${coordinates.x}%`);
            document.documentElement.style.setProperty("--y", `${coordinates.y}%`);
            } else {
            // Fallback au centre
            document.documentElement.style.setProperty("--x", "50%");
            document.documentElement.style.setProperty("--y", "50%");
            }

            // @ts-expect-error - startViewTransition property
            if (document.startViewTransition) {
            // @ts-expect-error - startViewTransition property
            document.startViewTransition(() => {
                set({ theme });
            });
            } else {
            set({ theme });
            }
        } else {
            set({ theme });
        }
      },
    }),
    {
      name: "theme-preference",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
