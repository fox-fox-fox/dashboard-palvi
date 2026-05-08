import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/utils/cn";

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children?: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const previousActive = useRef<Element | null>(null);
  const reactId = useId();
  const titleId = `modal-title-${reactId}`;

  // Animación de entrada: arranca oculto, después de un frame transiciona a visible.
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!open) {
      setEntered(false);
      return;
    }
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, [open]);

  // Escape + Tab trap
  useEffect(() => {
    if (!open) return;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;
      const nodes = panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (nodes.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (!first || !last) return;

      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey) {
        if (active === first || !panel.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (active === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  // Body scroll lock
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Focus management: guardar al abrir, mover foco al primer focusable, restaurar al cerrar.
  useEffect(() => {
    if (!open) return;
    previousActive.current = document.activeElement;

    const raf = requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const nodes = panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      const target = nodes.length > 0 ? nodes[0] : panel;
      target?.focus();
    });

    return () => {
      cancelAnimationFrame(raf);
      const prev = previousActive.current;
      if (prev instanceof HTMLElement && document.contains(prev)) {
        prev.focus();
      }
    };
  }, [open]);

  if (!open) return null;

  const labelProps = title != null ? { "aria-labelledby": titleId } : { "aria-label": "Detalle" };

  /*
   * Backdrop muy oscuro + blur fuerte: el dashboard de fondo se vuelve una
   * neblina indistinta, y el panel del modal "flota" claramente.
   * Panel usa surface en light (blanco puro vs backdrop gris oscuro = alto
   * contraste) y surface-2 en dark (brighter que las cards del fondo, que
   * usan surface, evitando el mimetizado del bug reportado).
   * `isolate` crea stacking context propio para evitar bleed-through.
   */
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 isolate flex items-center justify-center p-4",
        "bg-black/80 backdrop-blur-md",
        "transition-opacity duration-200 ease-out-expo motion-reduce:transition-none",
        entered ? "opacity-100" : "opacity-0",
      )}
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        {...labelProps}
        onClick={(event) => event.stopPropagation()}
        style={{ backgroundColor: "rgb(var(--color-modal-bg))" }}
        className={cn(
          "relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl",
          "border-2 border-border-strong shadow-2xl",
          "transition-all duration-200 ease-out-expo motion-reduce:transition-none",
          entered ? "scale-100 opacity-100" : "scale-95 opacity-0",
        )}
      >
        <div
          style={{ backgroundColor: "rgb(var(--color-modal-bg))" }}
          className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-border-strong"
        >
          {title != null ? (
            <h2 id={titleId} className="text-h2 font-semibold text-text pr-2">
              {title}
            </h2>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="ml-auto inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-text-muted hover:bg-surface-2 hover:text-text transition-colors duration-200 ease-out-expo"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div
          style={{ backgroundColor: "rgb(var(--color-modal-bg))" }}
          className="px-6 py-5"
        >
          {children}
        </div>
      </div>
    </div>
  );
}
