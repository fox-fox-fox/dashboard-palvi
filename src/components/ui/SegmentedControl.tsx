import { useRef } from "react";
import type { KeyboardEvent } from "react";
import { cn } from "@/utils/cn";

interface SegmentedControlProps<T extends string> {
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (next: T) => void;
  ariaLabel: string;
  className?: string;
  /**
   * "subtle" (default): activo usa surface neutro. Apto para selectores secundarios.
   * "accent": activo usa color de marca con texto blanco. Apto cuando el estado activo
   * debe ser inmediatamente visible (ej. el dataset actual).
   */
  tone?: "subtle" | "accent";
}

export function SegmentedControl<T extends string,>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
  tone = "subtle",
}: SegmentedControlProps<T>) {
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([]);

  const focusOption = (index: number) => {
    const target = buttonsRef.current[index];
    if (target) {
      target.focus();
      const next = options[index];
      if (next) onChange(next.value);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      focusOption((index + 1) % options.length);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      focusOption((index - 1 + options.length) % options.length);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusOption(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusOption(options.length - 1);
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center gap-1 rounded-lg bg-surface-2 p-1",
        className,
      )}
    >
      {options.map((option, index) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              buttonsRef.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              "min-h-11 min-w-11 px-3 text-small rounded-md transition-colors duration-200 ease-out-expo",
              isActive
                ? tone === "accent"
                  ? "bg-indigo-500 dark:bg-indigo-400 text-white font-bold shadow-md ring-2 ring-indigo-500/30 dark:ring-indigo-400/40"
                  : "bg-surface text-text font-medium shadow-sm"
                : "text-text-muted font-medium hover:text-text",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
