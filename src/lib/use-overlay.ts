"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Drives a native <dialog> that is only in the DOM while it is in use.
 *
 * Lazy mounting keeps ~20 size sheets out of the initial HTML, but it fights
 * exit animations: unmount the node the instant `open` flips false and the
 * closing transition never gets a frame. This bridges the two — `close()`
 * starts the CSS exit (which survives because the `.overlay` rules transition
 * `overlay`/`display` as discrete properties), and the node is removed only
 * once that transition has actually finished.
 *
 * The duration is read back off the element rather than hard-coded, so the
 * stylesheet stays the single source of truth and a reduced-motion user — whose
 * computed duration is effectively zero — unmounts immediately.
 */
export function useOverlay(open: boolean) {
  const ref = useRef<HTMLDialogElement | null>(null);
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  // Callback ref: the node appears only when `mounted` turns true, so
  // `showModal()` has to run at attach time rather than in a later effect.
  const ref_ = useCallback((el: HTMLDialogElement | null) => {
    ref.current = el;
    if (el && !el.open) el.showModal();
  }, []);

  useEffect(() => {
    if (open) return;
    const el = ref.current;
    if (!el) {
      setMounted(false);
      return;
    }
    if (el.open) el.close();

    const longest = getComputedStyle(el)
      .transitionDuration.split(",")
      .reduce((max, d) => Math.max(max, parseFloat(d) || 0), 0);

    const id = window.setTimeout(() => setMounted(false), longest * 1000 + 30);
    return () => window.clearTimeout(id);
  }, [open]);

  return { mounted, ref: ref_, node: ref };
}
