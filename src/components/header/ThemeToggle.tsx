import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/utils/cn";
import { useAppStore } from "@/store/useAppStore";
import type { Theme } from "@/store/types";

const NEXT: Record<Theme, Theme> = {
  light: "dark",
  dark: "system",
  system: "light",
};

const LABELS: Record<Theme, string> = {
  light: "claro",
  dark: "oscuro",
  system: "sistema",
};

export function ThemeToggle({ className }: { className?: string }) {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);

  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;

  return (
    <button
      type="button"
      onClick={() => setTheme(NEXT[theme])}
      aria-label={`Tema actual: ${LABELS[theme]}. Cambiar tema.`}
      className={cn(
        "inline-flex h-11 w-11 items-center justify-center rounded-full",
        "bg-surface-2 text-text-muted hover:text-text",
        "transition-colors duration-200 ease-out-expo",
        className,
      )}
    >
      <Icon size={16} aria-hidden="true" />
    </button>
  );
}
