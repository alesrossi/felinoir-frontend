import { useEffect, useState } from "react";

export interface ViewportMetrics {
  /** Height of the currently visible region, in CSS px. */
  height: number;
  /** Vertical offset of the visible region from the layout viewport top. */
  offsetTop: number;
}

/**
 * Tracks the visual viewport so an app-like, full-screen layout (e.g. a chat)
 * can stay pinned to the visible area above the on-screen keyboard.
 *
 * Why not just `h-dvh`? `dvh`/`vh` units do NOT shrink when the virtual
 * keyboard opens on iOS Safari, and only shrink on Android Chrome when
 * `interactive-widget=resizes-content` is set. The Visual Viewport API is the
 * only mechanism that reports the real visible region on every mobile browser,
 * so we drive the container's height/offset from it directly.
 *
 * Returns `null` until measured (SSR / browsers without the API), letting
 * callers fall back to a CSS `h-dvh` value.
 */
export function useKeyboardViewport(): ViewportMetrics | null {
  const [metrics, setMetrics] = useState<ViewportMetrics | null>(null);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      setMetrics({ height: vv.height, offsetTop: vv.offsetTop });
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return metrics;
}
