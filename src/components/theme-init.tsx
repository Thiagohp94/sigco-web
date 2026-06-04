"use client";

// Injected before React hydration to avoid flash of wrong theme
export function ThemeInitScript() {
  const script = `
    (function() {
      try {
        var t = localStorage.getItem('sigo-theme') || 'dark';
        document.documentElement.classList.remove('dark', 'light');
        document.documentElement.classList.add(t);
      } catch(e) {
        document.documentElement.classList.add('dark');
      }
    })();
  `;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
