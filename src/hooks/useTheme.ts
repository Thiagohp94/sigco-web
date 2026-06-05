"use client";

import { useState, useEffect } from "react";

/**
 * Hook centralizado para detectar o tema atual (dark/light).
 * Substitui o padrão repetido de useEffect + MutationObserver em cada página.
 *
 * @returns isDark — true quando o tema escuro está ativo
 */
export function useTheme(): boolean {
  const [isDark, setIsDark] = useState(() => {
    if (typeof document === "undefined") return true;
    return !document.documentElement.classList.contains("light");
  });

  useEffect(() => {
    const update = () => setIsDark(!document.documentElement.classList.contains("light"));
    update();
    const obs = new MutationObserver(update);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  return isDark;
}
