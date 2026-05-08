import { useEffect, useState } from "react";
import { useTheme as useThemePref } from "@/store/useAppStore";

type EffectiveTheme = "light" | "dark";

function getSystemTheme(): EffectiveTheme {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(effective: EffectiveTheme): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (effective === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

export function useTheme(): EffectiveTheme {
  const theme = useThemePref();
  const [effective, setEffective] = useState<EffectiveTheme>(() => {
    if (theme === "system") return getSystemTheme();
    return theme;
  });

  useEffect(() => {
    if (theme !== "system") {
      setEffective(theme);
      applyTheme(theme);
      return;
    }

    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      setEffective("light");
      applyTheme("light");
      return;
    }

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => {
      const next: EffectiveTheme = mq.matches ? "dark" : "light";
      setEffective(next);
      applyTheme(next);
    };
    update();
    mq.addEventListener("change", update);
    return () => {
      mq.removeEventListener("change", update);
    };
  }, [theme]);

  return effective;
}
