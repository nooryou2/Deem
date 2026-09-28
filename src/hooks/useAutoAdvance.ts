// src/hooks/useAutoAdvance.ts
//
// Moves a multi-step flow forward on its own once a step has everything it
// needs, so a selection that completes a step doesn't also require scrolling
// down to press Continue.
//
// Three rules keep it from firing when it shouldn't:
//
//  1. It only fires after the user interacts. Call `arm()` from the handlers
//     that can complete the step. Arriving on a step that happens to be
//     complete already (typically after pressing Back) does nothing.
//  2. It fires once per step. Without this, pressing Back would be undone
//     immediately and the user could never return.
//  3. It never advances onto a step that submits. Callers decide where it
//     points; a confirmation step is the end of the line.

import { useCallback, useEffect, useRef } from 'react';

interface Options {
  /** True when the current step has everything it needs. */
  ready: boolean;
  /** Where to go. Only called for a step that needs no more input. */
  advance: () => void;
  /** Lets a caller switch it off, e.g. while something is uploading. */
  enabled?: boolean;
  /** Small pause so the selection is visibly registered before moving on. */
  delayMs?: number;
}

export function useAutoAdvance({ ready, advance, enabled = true, delayMs = 320 }: Options) {
  const armed = useRef(false);
  const fired = useRef(false);
  // Kept in a ref so a changing callback doesn't retrigger the effect.
  const advanceRef = useRef(advance);
  advanceRef.current = advance;

  /** Call from a selection handler that could complete this step. */
  const arm = useCallback(() => {
    armed.current = true;
  }, []);

  /** Call when returning to a step, so it can advance again later. */
  const reset = useCallback(() => {
    armed.current = false;
    fired.current = false;
  }, []);

  useEffect(() => {
    if (!enabled || !ready || !armed.current || fired.current) return;
    fired.current = true;
    const id = setTimeout(() => advanceRef.current(), delayMs);
    return () => clearTimeout(id);
  }, [ready, enabled, delayMs]);

  return { arm, reset };
}
