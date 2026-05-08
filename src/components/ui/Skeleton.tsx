import type { CSSProperties } from "react";
import { cn } from "@/utils/cn";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "rect" | "circle";
  width?: string | number;
  height?: string | number;
}

const variantStyles = {
  text: "h-4 w-full rounded-sm",
  rect: "rounded-md",
  circle: "rounded-full",
} as const;

export function Skeleton({ className, variant = "rect", width, height }: SkeletonProps) {
  const style: CSSProperties = {};
  if (width !== undefined) style.width = typeof width === "number" ? `${width}px` : width;
  if (height !== undefined) style.height = typeof height === "number" ? `${height}px` : height;

  return (
    <div
      aria-hidden="true"
      className={cn(
        "bg-surface-2 motion-safe:animate-pulse",
        variantStyles[variant],
        className,
      )}
      style={style}
    />
  );
}
