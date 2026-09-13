"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

/**
 * Brief confirmations for things that just happened.
 *
 * Before this, a save navigated away and the operator inferred success from
 * the absence of an error — which is indistinguishable from a save that did
 * nothing. Every mutation in the panel now ends in a sentence.
 *
 * The region is `aria-live="polite"` and never takes focus: a message that
 * steals focus interrupts whatever the operator was typing, and an assertive
 * one interrupts a screen reader mid-word. Polite means it is announced at the
 * next natural pause, which is what a confirmation deserves.
 */

type Tone = "success" | "error";

interface Toast {
  id: number;
  tone: Tone;
  message: string;
  /** Offered for reversible actions, and only for as long as the toast lives. */
  undo?: () => void;
}

interface ToastApi {
  success: (message: string, undo?: () => void) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/** Long enough to read a sentence and reach Undo; short enough not to nag. */
const LIFETIME = 5000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((tone: Tone, message: string, undo?: () => void) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-2), { id, tone, message, undo }]);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (message, undo) => push("success", message, undo),
      error: (message) => push("error", message),
    }),
    [push],
  );

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[var(--z-overlay)] flex flex-col items-center gap-2 p-4 sm:items-end"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const hide = window.setTimeout(() => setLeaving(true), LIFETIME);
    const remove = window.setTimeout(onDismiss, LIFETIME + 240);
    return () => {
      window.clearTimeout(hide);
      window.clearTimeout(remove);
    };
  }, [onDismiss]);

  return (
    <div
      className={cn(
        "pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-[var(--radius-md)] px-4 py-3 shadow-[var(--shadow-pop)]",
        "transition-[opacity,transform] duration-[var(--dur-base)] [transition-timing-function:var(--ease-out-soft)]",
        "motion-reduce:transition-none",
        leaving ? "translate-y-1 opacity-0" : "translate-y-0 opacity-100",
        toast.tone === "success" ? "bg-ink text-white" : "bg-sale text-white",
      )}
    >
      <p className="min-w-0 flex-1 text-[13.5px] leading-snug">{toast.message}</p>

      {toast.undo ? (
        <button
          type="button"
          onClick={() => {
            toast.undo?.();
            onDismiss();
          }}
          className="shrink-0 rounded-[var(--radius-xs)] px-2 py-1 text-[13px] font-semibold underline underline-offset-2 hover:bg-white/10"
        >
          Undo
        </button>
      ) : null}

      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="shrink-0 rounded-[var(--radius-xs)] p-1 text-white/70 hover:bg-white/10 hover:text-white"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          aria-hidden
          className="size-4"
        >
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    </div>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>.");
  return ctx;
}
