import type { KeyboardEvent, ReactNode } from "react";
import { cn } from "@/utils/cn";

interface CardProps {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article";
  padded?: boolean;
  interactive?: boolean;
  onClick?: () => void;
  "aria-label"?: string;
}

export function Card({
  children,
  className,
  as: Tag = "div",
  padded = true,
  interactive = false,
  onClick,
  "aria-label": ariaLabel,
}: CardProps) {
  const isClickable = typeof onClick === "function";

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!isClickable) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick?.();
    }
  };

  return (
    <Tag
      className={cn(
        "bg-surface border border-border rounded-lg shadow-sm",
        padded && "p-5 md:p-6",
        interactive &&
          "cursor-pointer transition-[background,transform] duration-200 ease-out-expo hover:bg-surface-2 active:scale-[0.98]",
        className,
      )}
      onClick={onClick}
      onKeyDown={isClickable ? handleKeyDown : undefined}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={ariaLabel}
    >
      {children}
    </Tag>
  );
}
