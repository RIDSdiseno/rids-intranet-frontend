// src/context/AccessibilityContext.tsx
// integra MutationObserver para parchar estilos inline blancos.

import {
    createContext, useContext, useEffect, useRef,
    useMemo, useState, useCallback, type ReactNode,
} from "react";

export type FontSize = "small" | "normal" | "large" | "xlarge";
export type Contrast = "normal" | "high";
export type Motion = "normal" | "reduced";
export type ThemeMode = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export type AccessibilitySettings = {
    themeMode: ThemeMode;
    fontSize: FontSize;
    contrast: Contrast;
    motion: Motion;
    underlineLinks: boolean;
    readableSpacing: boolean;
};

export type AccessibilityContextValue = {
    settings: AccessibilitySettings;
    resolvedTheme: ResolvedTheme;
    setSetting: <K extends keyof AccessibilitySettings>(key: K, value: AccessibilitySettings[K]) => void;
    resetSettings: () => void;
};

const STORAGE_KEY = "rids_accessibility_settings";
const DEFAULT_SETTINGS: AccessibilitySettings = {
    themeMode: "system", fontSize: "normal", contrast: "normal",
    motion: "normal", underlineLinks: false, readableSpacing: false,
};

export function readInitialSettings(): AccessibilitySettings {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return DEFAULT_SETTINGS;
        const p = JSON.parse(raw);
        return {
            themeMode: p.themeMode ?? DEFAULT_SETTINGS.themeMode,
            fontSize: p.fontSize ?? DEFAULT_SETTINGS.fontSize,
            contrast: p.contrast ?? DEFAULT_SETTINGS.contrast,
            motion: p.motion ?? DEFAULT_SETTINGS.motion,
            underlineLinks: Boolean(p.underlineLinks),
            readableSpacing: Boolean(p.readableSpacing),
        };
    } catch { return DEFAULT_SETTINGS; }
}

export function getResolvedTheme(mode: ThemeMode): ResolvedTheme {
    if (mode === "system") {
        return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return mode;
}

export function applyAccessibilityClasses(s: AccessibilitySettings): void {
    const root = document.documentElement;
    const theme = getResolvedTheme(s.themeMode);
    root.classList.remove(
        "a11y-theme-light",
        "a11y-theme-dark",
        "a11y-font-small",
        "a11y-font-normal",
        "a11y-font-large",
        "a11y-font-xlarge",
        "a11y-contrast-normal",
        "a11y-contrast-high",
        "a11y-motion-normal",
        "a11y-motion-reduced",
        "a11y-underline-links",
        "a11y-readable-spacing"
    );
    root.classList.add(`a11y-theme-${theme}`, `a11y-font-${s.fontSize}`, `a11y-contrast-${s.contrast}`, `a11y-motion-${s.motion}`);
    if (s.underlineLinks) root.classList.add("a11y-underline-links");
    if (s.readableSpacing) root.classList.add("a11y-readable-spacing");
}

// ── MutationObserver: parchar estilos inline blancos ─────────────────────────
const WHITE_PATTERNS = ["white", "#fff", "#ffffff", "rgb(255, 255, 255)", "rgba(255, 255, 255, 1)"];
const savedStyles = new WeakMap<HTMLElement, { bg: string; color: string }>();

function isWhiteish(v: string): boolean {
    const s = v.trim().toLowerCase();
    return WHITE_PATTERNS.some((p) => s === p || s.startsWith(p));
}

function patchElement(el: HTMLElement): void {
    const bg = el.style.backgroundColor || el.style.background || "";
    const color = el.style.color || "";
    const bgWhite = !!bg && isWhiteish(bg);
    const colorDark = !!color && ["#000", "#000000", "black", "rgb(0, 0, 0)"].includes(color.toLowerCase());
    if (!bgWhite && !colorDark) return;
    if (!savedStyles.has(el)) {
        savedStyles.set(el, { bg: el.style.backgroundColor, color: el.style.color });
    }
    if (bgWhite) { el.style.setProperty("background-color", "#0f172a", "important"); el.style.setProperty("background", "#0f172a", "important"); }
    if (colorDark) { el.style.setProperty("color", "#f8fafc", "important"); }
}

function restoreElement(el: HTMLElement): void {
    const s = savedStyles.get(el); if (!s) return;
    el.style.backgroundColor = s.bg; el.style.color = s.color;
    savedStyles.delete(el);
}

function patchAll(root: Element = document.body): void {
    root.querySelectorAll<HTMLElement>("*").forEach(patchElement);
}
function restoreAll(): void {
    document.body.querySelectorAll<HTMLElement>("*").forEach((el) => { if (savedStyles.has(el)) restoreElement(el); });
}

// ── Contexto ─────────────────────────────────────────────────────────────────
const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

export function AccessibilityProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<AccessibilitySettings>(() => {
        const initial = readInitialSettings();
        applyAccessibilityClasses(initial);
        return initial;
    });

    const settingsRef = useRef(settings);
    useEffect(() => { settingsRef.current = settings; }, [settings]);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        applyAccessibilityClasses(settings);
    }, [settings]);

    useEffect(() => {
        const media = window.matchMedia?.("(prefers-color-scheme: dark)");
        if (!media) return;
        const handler = () => applyAccessibilityClasses(settingsRef.current);
        media.addEventListener("change", handler);
        return () => media.removeEventListener("change", handler);
    }, []);

    // ── MutationObserver para estilos inline ─────────────────────────────────
    const resolvedTheme = getResolvedTheme(settings.themeMode);
    const isDark = resolvedTheme === "dark";
    const observerRef = useRef<MutationObserver | null>(null);

    useEffect(() => {
        if (!isDark) {
            restoreAll();
            observerRef.current?.disconnect();
            observerRef.current = null;
            return;
        }

        patchAll(); // parche inicial de todos los elementos

        const observer = new MutationObserver((mutations) => {
            for (const m of mutations) {
                if (m.type === "attributes" && m.attributeName === "style") {
                    patchElement(m.target as HTMLElement);
                } else if (m.type === "childList") {
                    m.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            patchElement(node as HTMLElement);
                            patchAll(node as Element);
                        }
                    });
                }
            }
        });

        observer.observe(document.body, {
            childList: true, subtree: true,
            attributes: true, attributeFilter: ["style"],
        });

        observerRef.current = observer;
        return () => { observer.disconnect(); observerRef.current = null; };
    }, [isDark]);

    const setSetting = useCallback(
        <K extends keyof AccessibilitySettings>(key: K, value: AccessibilitySettings[K]) => {
            setSettings((prev) => ({ ...prev, [key]: value }));
        }, []
    );
    const resetSettings = useCallback(() => setSettings(DEFAULT_SETTINGS), []);
    const value = useMemo<AccessibilityContextValue>(
        () => ({ settings, resolvedTheme, setSetting, resetSettings }),
        [settings, resolvedTheme, setSetting, resetSettings]
    );

    return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>;
}

export function useAccessibility(): AccessibilityContextValue {
    const ctx = useContext(AccessibilityContext);
    if (!ctx) throw new Error("useAccessibility debe usarse dentro de <AccessibilityProvider>");
    return ctx;
}