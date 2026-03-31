"use client";

import { useLayoutEffect } from "react";

const applySystemTheme = () => {
  if (typeof window === "undefined") {
    return;
  }

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.classList.toggle("dark", prefersDark);
  document.documentElement.style.colorScheme = prefersDark ? "dark" : "light";
};

export function SystemThemeWatcher() {
  useLayoutEffect(() => {
    applySystemTheme();

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      applySystemTheme();
    };

    mediaQuery.addEventListener("change", onChange);

    return () => {
      mediaQuery.removeEventListener("change", onChange);
    };
  }, []);

  return null;
}
