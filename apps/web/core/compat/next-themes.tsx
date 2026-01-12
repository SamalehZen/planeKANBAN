import React, { useEffect, useState } from "react";
import { useVisualThemeStore } from "../store/visual-theme.store";

export function ThemeProvider({ children, themes, defaultTheme, ...props }: any) {
    const { theme } = useVisualThemeStore();

    useEffect(() => {
        const root = document.documentElement;
        // Remove likely classes. Plane uses data-theme, usually.
        // The user's provided code uses classList.remove("light", "dark").
        root.classList.remove("light", "dark");

        // Check if we need to set data-theme attribute as well (Plane UI often uses data-theme)

        let activeTheme = theme;
        if (theme === "system") {
            activeTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
        }

        root.classList.add(activeTheme);
        root.setAttribute("data-theme", activeTheme); // Ensure compatibility with Plane components
        root.style.colorScheme = activeTheme;

    }, [theme]);

    useEffect(() => {
        if (theme !== "system") return;
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handleChange = () => {
            const root = document.documentElement;
            if (theme === "system") {
                root.classList.remove("light", "dark");
                const sysVal = mediaQuery.matches ? "dark" : "light";
                root.classList.add(sysVal);
                root.setAttribute("data-theme", sysVal);
                root.style.colorScheme = sysVal;
            }
        };
        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
    }, [theme]);

    return <>{children}</>;
}

export function useTheme() {
    const { theme, setTheme } = useVisualThemeStore();
    const [resolvedTheme, setResolvedTheme] = useState<string | undefined>(undefined);
    // next-themes systemTheme
    const [systemTheme, setSystemTheme] = useState<'dark' | 'light' | undefined>(undefined);

    useEffect(() => {
        const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        setSystemTheme(isDark ? 'dark' : 'light');

        if (theme === 'system') {
            setResolvedTheme(isDark ? "dark" : "light");
        } else {
            setResolvedTheme(theme);
        }
    }, [theme]);

    return {
        theme,
        setTheme,
        resolvedTheme,
        themes: ['light', 'dark', 'system'],
        systemTheme,
        forcedTheme: undefined
    }
}
