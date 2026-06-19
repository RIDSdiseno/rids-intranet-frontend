// src/hooks/useDarkModeStyleOverride.ts
// ─────────────────────────────────────────────────────────────────────────────
// PROBLEMA QUE RESUELVE:
//   Algunos componentes (librerías de terceros, componentes legacy) aplican
//   `style="background-color: white"` o `style="background: #fff"` de forma
//   inline. El CSS de clases no puede sobrescribir estilos inline por
//   especificidad — necesitamos JS para leerlos y reemplazarlos.
//
// FUNCIONAMIENTO:
//   1. Al montar, recorre todos los elementos del DOM y parchea los blancos.
//   2. Un MutationObserver observa cambios posteriores (nuevos nodos,
//      cambios de atributo style) y los parchea en tiempo real.
//   3. Al desmontar (tema claro) restaura los estilos originales usando un
//      WeakMap → no se pierde información ni se corrompen componentes.
//
// USO:
//   Llamar en un componente que viva mientras la app esté montada,
//   p.ej. directamente en AccessibilityProvider o en App.tsx.
//   Solo se activa cuando resolvedTheme === "dark".

import { useEffect, useRef } from "react";

// Colores que se consideran "fondo blanco" y deben transformarse
const WHITE_PATTERNS = [
    "white",
    "#fff",
    "#ffffff",
    "rgb(255, 255, 255)",
    "rgba(255, 255, 255, 1)",
];

// Mapa de valores oscuros de sustitución por luminosidad del original
const DARK_SURFACE = "#0f172a";  // --color-surface
const DARK_SURFACE_2 = "#1e293b";  // --color-surface-2

function isWhiteish(value: string): boolean {
    const v = value.trim().toLowerCase();
    return WHITE_PATTERNS.some((p) => v === p || v.includes(p));
}

function getDarkReplacement(original: string): string {
    // Blancos puros → surface; blancos con opacidad → surface-2
    if (original.includes("rgba") || original.includes("0.9") || original.includes("0.8")) {
        return DARK_SURFACE_2;
    }
    return DARK_SURFACE;
}

// WeakMap para guardar el estilo original y poder restaurarlo
const originalStyles = new WeakMap<HTMLElement, { bg: string; color: string }>();

function patchElement(el: HTMLElement): void {
    const style = el.style;
    const bg = style.backgroundColor || style.background || "";
    const color = style.color || "";

    const bgIsWhite = bg && isWhiteish(bg);
    const colorIsDark = color && (color === "#000" || color === "#000000" || color === "black" || color === "rgb(0, 0, 0)");

    if (!bgIsWhite && !colorIsDark) return;

    // Guardar original solo si no está ya guardado
    if (!originalStyles.has(el)) {
        originalStyles.set(el, { bg: style.backgroundColor, color: style.color });
    }

    if (bgIsWhite) {
        style.setProperty("background-color", getDarkReplacement(bg), "important");
        style.setProperty("background", getDarkReplacement(bg), "important");
    }
    if (colorIsDark) {
        style.setProperty("color", "#f8fafc", "important");
    }
}

function restoreElement(el: HTMLElement): void {
    const saved = originalStyles.get(el);
    if (!saved) return;
    el.style.backgroundColor = saved.bg;
    el.style.color = saved.color;
    originalStyles.delete(el);
}

function patchAllElements(root: Element = document.body): void {
    root.querySelectorAll<HTMLElement>("*").forEach(patchElement);
}

function restoreAllElements(): void {
    document.body.querySelectorAll<HTMLElement>("*").forEach((el) => {
        if (originalStyles.has(el)) restoreElement(el);
    });
}

// ────────────────────────────────────────────────────────────────────────────
// Hook
// ────────────────────────────────────────────────────────────────────────────

export function useDarkModeStyleOverride(isDark: boolean): void {
    const observerRef = useRef<MutationObserver | null>(null);

    useEffect(() => {
        if (!isDark) {
            // Restaurar estilos originales al salir del modo oscuro
            restoreAllElements();
            observerRef.current?.disconnect();
            observerRef.current = null;
            return;
        }

        // Patch inicial — todos los elementos existentes
        patchAllElements();

        // Observer para elementos que aparezcan después (modales, dropdowns…)
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === "attributes" && mutation.attributeName === "style") {
                    // Un elemento cambió su style inline
                    patchElement(mutation.target as HTMLElement);
                } else if (mutation.type === "childList") {
                    // Se añadieron nodos nuevos
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            patchElement(node as HTMLElement);
                            patchAllElements(node as Element);
                        }
                    });
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["style"],
        });

        observerRef.current = observer;

        return () => {
            observer.disconnect();
            observerRef.current = null;
        };
    }, [isDark]);
}